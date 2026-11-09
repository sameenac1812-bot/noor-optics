const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

function getPs1Files(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                results = results.concat(getPs1Files(file));
            }
        } else if (file.endsWith('.ps1')) {
            results.push(file);
        }
    });
    return results;
}

const files = getPs1Files('.');
console.log(`Found ${files.length} .ps1 files:`, files);

let anyFailed = false;
for (const file of files) {
    const fullPath = path.resolve(file);
    const psScript = `
        $errors = $null
        $tokens = $null
        [System.Management.Automation.Language.Parser]::ParseFile('${fullPath.replace(/'/g, "''")}', [ref]$tokens, [ref]$errors) | Out-Null
        if ($errors.Count -gt 0) {
            Write-Host "FAILED"
            $errors | ForEach-Object { Write-Host ("  Line " + $_.Extent.StartLineNumber + ", col " + $_.Extent.StartColumnNumber + ": " + $_.Message) }
            exit 1
        } else {
            Write-Host "SUCCESS"
            exit 0
        }
    `;
    const tempPs = path.join(__dirname, 'temp_check.ps1');
    fs.writeFileSync(tempPs, psScript);
    try {
        const out = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempPs}"`, { encoding: 'utf-8' });
        console.log(`[PASS] ${file}: ${out.trim()}`);
    } catch (err) {
        console.error(`[FAIL] ${file}:\n${err.stdout || err.message}`);
        anyFailed = true;
    } finally {
        if (fs.existsSync(tempPs)) fs.unlinkSync(tempPs);
    }
}

if (anyFailed) {
    process.exit(1);
} else {
    console.log('\nAll PowerShell scripts parsed successfully with 0 errors!');
}
