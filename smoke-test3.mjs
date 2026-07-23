import { chromium } from "playwright"
import fs from "fs"

const shotDir = "C:\\Users\\DICT10~1\\AppData\\Local\\Temp\\claude\\c--Users-DICT10-pc-2-Desktop-Client-Projects-GCGEA-MLBMS\\c5dfce3f-d0f5-4f96-b85b-2ae52e9e380b\\scratchpad\\shots"
fs.mkdirSync(shotDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errors = []
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()) })
page.on("pageerror", (err) => errors.push("pageerror: " + err.message))

async function shot(name) {
  await page.screenshot({ path: `${shotDir}\\${name}.png`, fullPage: true })
  console.log("SCREENSHOT", name)
}

async function login(username) {
  await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" })
  await page.fill('input[placeholder*="jdelacruz"]', username)
  await page.fill('input[type="password"]', "Gcgea@2026")
  await page.click('button:has-text("Sign In")')
  await page.waitForURL("**/dashboard", { timeout: 15000 })
  await page.waitForTimeout(500)
}

await login("test_loan_officer")

console.log("=== Loan Detail Page (should have NO action buttons) ===")
await page.goto("http://localhost:5173/loans/1", { waitUntil: "networkidle" })
await page.waitForTimeout(800)
await shot("11-loan-detail-no-actions")
const loanDetailBody = await page.locator("body").innerText()
console.log("Has 'Mark Reviewed' button (expect false):", loanDetailBody.includes("Mark Reviewed"))
console.log("Has 'Print Application' button (expect true):", loanDetailBody.includes("Print Application"))

console.log("=== My Approvals (should list the pending loan) ===")
await page.goto("http://localhost:5173/my-approvals", { waitUntil: "networkidle" })
await page.waitForTimeout(1000)
const myApprovalsBody = await page.locator("body").innerText()
console.log("Shows GCGEA-LN reference:", /GCGEA-LN/.test(myApprovalsBody))

console.log("=== Approval Detail Page (SHOULD have action buttons) ===")
await page.goto("http://localhost:5173/approvals/loans/1", { waitUntil: "networkidle" })
await page.waitForTimeout(1000)
await shot("12-approval-detail-has-actions")
const approvalDetailBody = await page.locator("body").innerText()
console.log("Has 'Mark Reviewed' button (expect true):", approvalDetailBody.includes("Mark Reviewed"))
console.log("Has 'Open Full Record' link (expect true):", approvalDetailBody.includes("Open Full Record"))

console.log("=== Member Profile Page (should have NO approve/reject buttons) ===")
await login("mcsantos")
await page.goto("http://localhost:5173/members", { waitUntil: "networkidle" })
await page.waitForTimeout(800)
await page.locator('table a[href^="/members/"]').first().click()
await page.waitForTimeout(800)
await shot("13-member-profile-no-actions")
const memberBody = await page.locator("body").innerText()
console.log("Has 'Approve Registration' button (expect false):", memberBody.includes("Approve Registration"))
console.log("Has 'Edit Profile' button (expect true):", memberBody.includes("Edit Profile"))

console.log("=== Console errors ===")
console.log(JSON.stringify(errors, null, 2))

await browser.close()
