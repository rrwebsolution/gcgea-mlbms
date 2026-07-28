const PAYROLL_HEADERS = [
  "member_number",
  "employee_number",
  "name",
  "loan_remarks",
  "principal",
  "interest",
  "principal_balance_previous",
  "interest_balance_previous",
  "current_month_loan_payment",
  "monthly_dues",
  "pabaon",
  "total_remit",
  "principal_balance_current",
  "interest_balance_current",
  "total_balance_current",
  // Appended at the end rather than inserted earlier so every existing
  // hardcoded column-letter formula/range above stays valid unshifted.
  "office_name",
];

const PAYROLL_REQUIRED_HEADERS = ["name", "principal", "interest", "monthly_dues", "pabaon", "total_remit"];
const PAYROLL_AMOUNT_HEADERS = [
  "principal",
  "interest",
  "principal_balance_previous",
  "interest_balance_previous",
  "current_month_loan_payment",
  "monthly_dues",
  "pabaon",
  "total_remit",
  "principal_balance_current",
  "interest_balance_current",
  "total_balance_current",
];
const PAYROLL_INPUT_AMOUNT_HEADERS = [
  "principal",
  "interest",
  "principal_balance_previous",
  "interest_balance_previous",
  "monthly_dues",
  "pabaon",
];
const PAYROLL_DATA_START_ROW = 2;
const PAYROLL_MAX_ROWS = 2000;
const MEMBER_PROFILE_SHEET_NAME = "Member Profile Import";
const PAYROLL_MEMBER_LIST_SHEET_NAME = "_Payroll Member Names";
const PAYROLL_OFFICE_LIST_SHEET_NAME = "_Payroll Office Names";

// Mirrors the system's OfficeSeeder.php (Active offices only) — hardcoded
// here rather than scanned from Member Profile Import so every office the
// system knows about is selectable, even ones with no members entered in
// that sheet yet. Update this list by hand if the seeder changes.
const PAYROLL_OFFICE_NAMES = [
  "Mayor's Office",
  "City Treasurer's Office",
  "City Accounting Office",
  "City Budget Office",
  "City Assessor's Office",
  "City Human Resource Management Office",
  "City Planning and Development Office",
  "City Engineer's Office",
  "City Health Office",
  "City Social Welfare and Development Office",
  "City Agriculture Office",
  "City Veterinary Office",
  "City Environment and Natural Resources Office",
  "City Disaster Risk Reduction and Management Office",
  "City Legal Office",
  "City General Services Office",
  "Sangguniang Panlungsod",
  "Office of the City Civil Registrar",
  "City Tourism Office",
];

function myFunction() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "Payroll Import";
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

  preparePayrollHeaders_(sheet);
  preparePayrollLayout_(sheet);
  applyPayrollFormats_(sheet);
  applyPayrollValidations_(sheet);
  applyPayrollMemberNameValidation_(spreadsheet, sheet);
  applyPayrollOfficeNameValidation_(spreadsheet, sheet);
  applyPayrollRequiredRules_(sheet);
  addPayrollHeaderGuidance_(sheet);
  createPayrollInstructions_(spreadsheet);
  spreadsheet.setActiveSheet(sheet);

  SpreadsheetApp.flush();
  spreadsheet.toast(
    "The blank Payroll Import template is ready.",
    "GCGEA Payroll Import",
    5
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("GCGEA Payroll Import")
    .addItem("Prepare / Repair Template", "myFunction")
    .addItem("Refresh Member & Office Lists", "refreshPayrollMemberNames")
    .addItem("Validate Payroll Data", "validatePayrollData")
    .addSeparator()
    .addItem("Clear Payroll Rows", "clearPayrollData")
    .addToUi();
}

function refreshPayrollMemberNames() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const payrollSheet = spreadsheet.getSheetByName("Payroll Import");
  if (!payrollSheet) {
    SpreadsheetApp.getUi().alert('Run "Prepare / Repair Template" first.');
    return;
  }

  applyPayrollMemberNameValidation_(spreadsheet, payrollSheet);
  applyPayrollOfficeNameValidation_(spreadsheet, payrollSheet);
  spreadsheet.toast(
    "Member names now follow the Member Profile Import sheet; office names now follow the system's registered office list.",
    "Lists refreshed",
    5
  );
}

function onEdit(event) {
  if (!event || !event.range || event.range.getRow() < PAYROLL_DATA_START_ROW) return;

  const sheet = event.range.getSheet();
  if (sheet.getName() !== "Payroll Import") return;
  const header = String(sheet.getRange(1, event.range.getColumn()).getValue()).trim();

  if (["member_number", "employee_number"].includes(header) && event.value) {
    event.range.setNumberFormat("@").setValue(String(event.value).trim());
  }

  const firstRow = event.range.getRow();
  const lastRow = event.range.getLastRow();
  for (let row = firstRow; row <= lastRow; row++) {
    applyPayrollRowFormulas_(sheet, row);
  }
}

function validatePayrollData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < PAYROLL_DATA_START_ROW) {
    SpreadsheetApp.getUi().alert("No payroll rows were found.");
    return;
  }

  const headerMap = getPayrollHeaderMap_(sheet);
  const values = sheet
    .getRange(PAYROLL_DATA_START_ROW, 1, lastRow - PAYROLL_DATA_START_ROW + 1, PAYROLL_HEADERS.length)
    .getDisplayValues();
  const errors = [];

  values.forEach((row, index) => {
    const sheetRow = index + PAYROLL_DATA_START_ROW;
    if (row.every((value) => !String(value).trim())) return;

    const name = String(row[headerMap.name - 1] || "").trim();
    const memberNumber = String(row[headerMap.member_number - 1] || "").trim();
    const employeeNumber = String(row[headerMap.employee_number - 1] || "").trim();

    if (!name) errors.push(`Row ${sheetRow}: name is required.`);
    if (!memberNumber && !employeeNumber) {
      errors.push(`Row ${sheetRow}: provide member_number or employee_number for reliable matching.`);
    }

    PAYROLL_AMOUNT_HEADERS.forEach((header) => {
      const raw = String(row[headerMap[header] - 1] || "").replace(/[₱,\s]/g, "");
      if (raw === "") return;
      const amount = Number(raw);
      if (!Number.isFinite(amount)) errors.push(`Row ${sheetRow}: ${header} must be numeric.`);
      else if (amount < 0) errors.push(`Row ${sheetRow}: ${header} cannot be negative.`);
    });

    const principal = numberFromCell_(row[headerMap.principal - 1]);
    const interest = numberFromCell_(row[headerMap.interest - 1]);
    const dues = numberFromCell_(row[headerMap.monthly_dues - 1]);
    const pabaon = numberFromCell_(row[headerMap.pabaon - 1]);
    const currentLoanPayment = numberFromCell_(row[headerMap.current_month_loan_payment - 1]);
    const totalRemit = numberFromCell_(row[headerMap.total_remit - 1]);

    if (Math.abs(currentLoanPayment - (principal + interest)) > 0.01) {
      errors.push(`Row ${sheetRow}: current_month_loan_payment must equal principal + interest.`);
    }
    if (Math.abs(totalRemit - (principal + interest + dues + pabaon)) > 0.01) {
      errors.push(`Row ${sheetRow}: total_remit must equal principal + interest + monthly_dues + pabaon.`);
    }
  });

  if (!errors.length) {
    SpreadsheetApp.getUi().alert("Validation successful. The payroll sheet is ready for Excel export.");
    return;
  }

  const visibleErrors = errors.slice(0, 50);
  const suffix = errors.length > 50 ? `\n\n...and ${errors.length - 50} more issue(s).` : "";
  SpreadsheetApp.getUi().alert(`Please correct the following:\n\n${visibleErrors.join("\n")}${suffix}`);
}

function clearPayrollData() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    "Clear payroll data?",
    "This clears row 2 downward and restores the automatic formulas.",
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return;

  const sheet = SpreadsheetApp.getActiveSheet();
  sheet
    .getRange(PAYROLL_DATA_START_ROW, 1, PAYROLL_MAX_ROWS - 1, PAYROLL_HEADERS.length)
    .clearContent();
}

function applyPayrollRowFormulas_(sheet, row) {
  if (row < PAYROLL_DATA_START_ROW) return;

  const headerMap = getPayrollHeaderMap_(sheet);
  const inputHeaders = [
    "member_number",
    "employee_number",
    "name",
    "loan_remarks",
    "principal",
    "interest",
    "principal_balance_previous",
    "interest_balance_previous",
    "monthly_dues",
    "pabaon",
  ];
  const hasInput = inputHeaders.some((header) =>
    String(sheet.getRange(row, headerMap[header]).getDisplayValue()).trim()
  );

  const formulas = {
    current_month_loan_payment: hasInput ? `=N(E${row})+N(F${row})` : "",
    total_remit: hasInput ? `=N(E${row})+N(F${row})+N(J${row})+N(K${row})` : "",
    principal_balance_current: hasInput && sheet.getRange(row, headerMap.principal_balance_previous).getValue() !== ""
      ? `=MAX(0,N(G${row})-N(E${row}))`
      : "",
    interest_balance_current: hasInput && sheet.getRange(row, headerMap.interest_balance_previous).getValue() !== ""
      ? `=MAX(0,N(H${row})-N(F${row}))`
      : "",
  };
  formulas.total_balance_current =
    formulas.principal_balance_current || formulas.interest_balance_current
      ? `=N(M${row})+N(N${row})`
      : "";

  Object.entries(formulas).forEach(([header, formula]) => {
    const cell = sheet.getRange(row, headerMap[header]);
    cell.clearDataValidations();
    if (formula) cell.setFormula(formula);
    else cell.clearContent();
  });
}

function preparePayrollHeaders_(sheet) {
  if (sheet.getMaxColumns() < PAYROLL_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), PAYROLL_HEADERS.length - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < PAYROLL_MAX_ROWS) {
    sheet.insertRowsAfter(sheet.getMaxRows(), PAYROLL_MAX_ROWS - sheet.getMaxRows());
  }
  sheet.getRange(1, 1, 1, PAYROLL_HEADERS.length).setValues([PAYROLL_HEADERS]);
  sheet.setFrozenRows(1);
}

function preparePayrollLayout_(sheet) {
  sheet
    .getRange(1, 1, 1, PAYROLL_HEADERS.length)
    .setBackground("#1E3A8A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  sheet.setRowHeight(1, 48);
  sheet.setColumnWidths(1, PAYROLL_HEADERS.length, 145);
  sheet.setColumnWidth(3, 210);
  sheet.setColumnWidth(4, 210);
  sheet.setColumnWidths(7, 9, 175);
  sheet.setColumnWidth(PAYROLL_HEADERS.length, 200); // office_name, always the last header

  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, Math.max(2, sheet.getLastRow()), PAYROLL_HEADERS.length).createFilter();
  sheet
    .getRange(PAYROLL_DATA_START_ROW, 1, PAYROLL_MAX_ROWS - 1, PAYROLL_HEADERS.length)
    .setVerticalAlignment("middle");
}

function applyPayrollFormats_(sheet) {
  const headerMap = getPayrollHeaderMap_(sheet);
  sheet
    .getRange(PAYROLL_DATA_START_ROW, headerMap.member_number, PAYROLL_MAX_ROWS - 1, 2)
    .setNumberFormat("@");

  PAYROLL_AMOUNT_HEADERS.forEach((header) => {
    sheet
      .getRange(PAYROLL_DATA_START_ROW, headerMap[header], PAYROLL_MAX_ROWS - 1, 1)
      .setNumberFormat("₱#,##0.00;[Red]-₱#,##0.00");
  });
}

function applyPayrollValidations_(sheet) {
  const headerMap = getPayrollHeaderMap_(sheet);
  const nonNegativeRule = SpreadsheetApp.newDataValidation()
    .requireNumberGreaterThanOrEqualTo(0)
    .setAllowInvalid(false)
    .setHelpText("Enter zero or a positive amount only.")
    .build();

  PAYROLL_INPUT_AMOUNT_HEADERS.forEach((header) => {
    sheet
      .getRange(PAYROLL_DATA_START_ROW, headerMap[header], PAYROLL_MAX_ROWS - 1, 1)
      .setDataValidation(nonNegativeRule);
  });
}

function applyPayrollMemberNameValidation_(spreadsheet, payrollSheet) {
  const memberSheet = spreadsheet.getSheetByName(MEMBER_PROFILE_SHEET_NAME);
  if (!memberSheet) {
    spreadsheet.toast(
      `Create or prepare "${MEMBER_PROFILE_SHEET_NAME}" before encoding payroll.`,
      "Member Profile sheet not found",
      8
    );
    return;
  }

  const memberLastColumn = Math.max(1, memberSheet.getLastColumn());
  const memberHeaders = memberSheet
    .getRange(1, 1, 1, memberLastColumn)
    .getDisplayValues()[0]
    .map((header) => String(header).trim().toLowerCase());
  const nameColumn = memberHeaders.indexOf("name") + 1;
  const surnameColumn = memberHeaders.indexOf("surname") + 1;
  const firstNameColumn = memberHeaders.indexOf("first_name") + 1;
  const middleNameColumn = memberHeaders.indexOf("middle_name") + 1;

  if (!nameColumn && (!surnameColumn || !firstNameColumn)) {
    spreadsheet.toast(
      `The "${MEMBER_PROFILE_SHEET_NAME}" sheet must contain name, or surname and first_name headers.`,
      "Member name headers not found",
      8
    );
    return;
  }

  const lastRow = memberSheet.getLastRow();
  const memberNames = lastRow < PAYROLL_DATA_START_ROW
    ? []
    : memberSheet
        .getRange(
          PAYROLL_DATA_START_ROW,
          1,
          lastRow - PAYROLL_DATA_START_ROW + 1,
          memberLastColumn
        )
        .getDisplayValues()
        .map((row) => {
          if (nameColumn) return String(row[nameColumn - 1] || "").trim();
          return [
            String(row[firstNameColumn - 1] || "").trim(),
            middleNameColumn ? String(row[middleNameColumn - 1] || "").trim() : "",
            String(row[surnameColumn - 1] || "").trim(),
          ].filter(Boolean).join(" ");
        })
        .filter(Boolean)
        .filter((name, index, names) => names.indexOf(name) === index)
        .sort((a, b) => a.localeCompare(b));

  if (!memberNames.length) {
    spreadsheet.toast(
      "Add member records to Member Profile Import before encoding payroll.",
      "No registered member names found",
      8
    );
    return;
  }

  let listSheet = spreadsheet.getSheetByName(PAYROLL_MEMBER_LIST_SHEET_NAME);
  if (!listSheet) listSheet = spreadsheet.insertSheet(PAYROLL_MEMBER_LIST_SHEET_NAME);
  listSheet.clearContents();
  listSheet.getRange(1, 1).setValue("Registered member names");
  listSheet.getRange(2, 1, memberNames.length, 1).setValues(memberNames.map((name) => [name]));
  listSheet.hideSheet();

  const memberNameRange = listSheet.getRange(2, 1, memberNames.length, 1);
  const payrollHeaderMap = getPayrollHeaderMap_(payrollSheet);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(memberNameRange, true)
    .setAllowInvalid(false)
    .setHelpText("Select a member registered in the Member Profile Import sheet.")
    .build();

  payrollSheet
    .getRange(
      PAYROLL_DATA_START_ROW,
      payrollHeaderMap.name,
      PAYROLL_MAX_ROWS - 1,
      1
    )
    .setDataValidation(rule);
}

/**
 * Populates the office_name dropdown straight from PAYROLL_OFFICE_NAMES (the
 * system's actual office list, mirroring OfficeSeeder.php) rather than
 * scanning Member Profile Import — that sheet only has offices with members
 * already entered, which would hide offices with zero members so far.
 * Optional (not in PAYROLL_REQUIRED_HEADERS): the system cross-checks it
 * against the matched member's registered office as a warning, not a hard
 * block, since it's only a sanity check, not what's actually used to post
 * the deduction.
 */
function applyPayrollOfficeNameValidation_(spreadsheet, payrollSheet) {
  let listSheet = spreadsheet.getSheetByName(PAYROLL_OFFICE_LIST_SHEET_NAME);
  if (!listSheet) listSheet = spreadsheet.insertSheet(PAYROLL_OFFICE_LIST_SHEET_NAME);
  listSheet.clearContents();
  listSheet.getRange(1, 1).setValue("Registered office names");
  listSheet.getRange(2, 1, PAYROLL_OFFICE_NAMES.length, 1).setValues(PAYROLL_OFFICE_NAMES.map((name) => [name]));
  listSheet.hideSheet();

  const officeNameRange = listSheet.getRange(2, 1, PAYROLL_OFFICE_NAMES.length, 1);
  const payrollHeaderMap = getPayrollHeaderMap_(payrollSheet);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(officeNameRange, true)
    .setAllowInvalid(false)
    .setHelpText("Select an office from the system's registered offices.")
    .build();

  payrollSheet
    .getRange(
      PAYROLL_DATA_START_ROW,
      payrollHeaderMap.office_name,
      PAYROLL_MAX_ROWS - 1,
      1
    )
    .setDataValidation(rule);
}

function applyPayrollFormulas_(sheet) {
  const headerMap = getPayrollHeaderMap_(sheet);
  const formulaHeaders = [
    "current_month_loan_payment",
    "total_remit",
    "principal_balance_current",
    "interest_balance_current",
    "total_balance_current",
  ];

  formulaHeaders.forEach((header) => {
    const column = headerMap[header];
    // Remove old strict numeric validation before inserting formulas. A
    // formula intentionally returning "" is valid but Google Sheets rejects
    // it when a >= 0 validation rule is still attached to the column.
    sheet
      .getRange(PAYROLL_DATA_START_ROW, column, PAYROLL_MAX_ROWS - 1, 1)
      .clearDataValidations();
    const formulas = [];
    for (let row = PAYROLL_DATA_START_ROW; row <= PAYROLL_MAX_ROWS; row++) {
      let formula = "";
      if (header === "current_month_loan_payment") {
        formula = `=IF(COUNTA(A${row}:H${row},J${row}:K${row})=0,"",N(E${row})+N(F${row}))`;
      } else if (header === "total_remit") {
        formula = `=IF(COUNTA(A${row}:K${row})=0,"",N(E${row})+N(F${row})+N(J${row})+N(K${row}))`;
      } else if (header === "principal_balance_current") {
        formula = `=IF(G${row}="","",MAX(0,N(G${row})-N(E${row})))`;
      } else if (header === "interest_balance_current") {
        formula = `=IF(H${row}="","",MAX(0,N(H${row})-N(F${row})))`;
      } else {
        formula = `=IF(AND(M${row}="",N${row}=""),"",N(M${row})+N(N${row}))`;
      }
      formulas.push([formula]);
    }
    sheet.getRange(PAYROLL_DATA_START_ROW, column, PAYROLL_MAX_ROWS - 1, 1).setFormulas(formulas);
  });

  const formulaColumns = formulaHeaders.map((header) => headerMap[header]);
  formulaColumns.forEach((column) => {
    sheet
      .getRange(PAYROLL_DATA_START_ROW, column, PAYROLL_MAX_ROWS - 1, 1)
      .setBackground("#EFF6FF")
      .setFontColor("#1E3A8A");
  });
}

function applyPayrollRequiredRules_(sheet) {
  const headerMap = getPayrollHeaderMap_(sheet);
  const rules = [];
  const lastColumnLetter = payrollColumnLetter_(PAYROLL_HEADERS.length);

  PAYROLL_REQUIRED_HEADERS.forEach((header) => {
    const column = headerMap[header];
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND(COUNTA($A2:$${lastColumnLetter}2)>0,${payrollColumnLetter_(column)}2="")`)
        .setBackground("#FEE2E2")
        .setFontColor("#B91C1C")
        .setRanges([sheet.getRange(PAYROLL_DATA_START_ROW, column, PAYROLL_MAX_ROWS - 1, 1)])
        .build()
    );
  });

  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND(COUNTA($A2:$${lastColumnLetter}2)>0,$A2="",$B2="")`)
      .setBackground("#FEF3C7")
      .setRanges([sheet.getRange(PAYROLL_DATA_START_ROW, 1, PAYROLL_MAX_ROWS - 1, 2)])
      .build()
  );
  sheet.setConditionalFormatRules(rules);
}

function addPayrollHeaderGuidance_(sheet) {
  const notes = {
    member_number: "Strongly recommended. Used first when matching a member.",
    employee_number: "Recommended when member_number is unavailable.",
    name: "REQUIRED. Use the member's complete registered name.",
    loan_remarks: "Optional. Examples: Fully Paid or New Loan 10/2026. This is not a date field.",
    principal: "REQUIRED. Principal portion of this month's loan payment. Enter 0 when none.",
    interest: "REQUIRED. Interest portion of this month's loan payment. Enter 0 when none.",
    principal_balance_previous: "Optional previous-month principal balance.",
    interest_balance_previous: "Optional previous-month interest balance.",
    current_month_loan_payment: "AUTOMATIC: principal + interest.",
    monthly_dues: "REQUIRED. Monthly Dues amount. Enter 0 when none.",
    pabaon: "REQUIRED. Cash Pabaon/deduction amount. Enter 0 when none.",
    total_remit: "AUTOMATIC: principal + interest + monthly_dues + pabaon.",
    principal_balance_current: "AUTOMATIC: previous principal balance − principal payment.",
    interest_balance_current: "AUTOMATIC: previous interest balance − interest payment.",
    total_balance_current: "AUTOMATIC: current principal balance + current interest balance.",
    office_name: "Recommended. Select from the system's registered offices — cross-checked against the matched member's own office (flagged as a warning, not blocked, if they differ).",
  };

  PAYROLL_HEADERS.forEach((header, index) => sheet.getRange(1, index + 1).setNote(notes[header] || ""));
}

function createPayrollInstructions_(spreadsheet) {
  const name = "Payroll Instructions";
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  sheet.clear();

  const rows = [
    ["GCGEA Payroll Deduction Import Guidelines", ""],
    ["Payroll period", "Enter the YYYY-MM period in the GCGEA import wizard, not in every spreadsheet row."],
    ["Member matching", "member_number is checked first, then employee_number, then name."],
    ["Required amounts", "principal, interest, monthly_dues, pabaon, and total_remit must contain zero or a positive number."],
    ["Automatic columns", "Blue columns contain formulas. Do not manually encode them unless correction is necessary."],
    ["Loan payment", "principal or interest greater than zero requires an active/postable loan in the system."],
    ["Monthly Dues", "Existing posted Monthly Dues for the same member and period are skipped."],
    ["Pabaon", "Requires an active deduction type in System Settings."],
    ["Office", "Optional but recommended — pick from the dropdown (the system's registered office list). Cross-checked against the matched member's own registered office; a mismatch is flagged as a warning, not blocked."],
    ["Duplicates", "Do not upload the same payroll period twice without reviewing the duplicate-batch warning."],
    ["Before export", "Run GCGEA Payroll Import → Validate Payroll Data."],
    ["Export format", "Use Microsoft Excel (.xlsx) to preserve computed values reliably."],
  ];

  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange("A1:B1").merge().setBackground("#1E3A8A").setFontColor("#FFFFFF").setFontWeight("bold");
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 560);
  sheet.getRange(1, 1, rows.length, 2).setWrap(true).setVerticalAlignment("top");
  sheet.setFrozenRows(1);
}

function getPayrollHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, PAYROLL_HEADERS.length).getDisplayValues()[0];
  return headers.reduce((map, header, index) => {
    map[String(header).trim()] = index + 1;
    return map;
  }, {});
}

function numberFromCell_(value) {
  const normalized = String(value || "").replace(/[₱,\s]/g, "");
  const number = Number(normalized || 0);
  return Number.isFinite(number) ? number : 0;
}

function payrollColumnLetter_(column) {
  let letter = "";
  while (column > 0) {
    const remainder = (column - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    column = Math.floor((column - 1) / 26);
  }
  return letter;
}
