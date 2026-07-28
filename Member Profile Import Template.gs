const MEMBER_HEADERS = [
  "surname",
  "first_name",
  "middle_name",
  "birthdate",
  "sex",
  "email",
  "cellphone_number",
  "permanent_address",
  "name_of_spouse",
  "office_name",
  "position",
  "date_of_regular_appointment",
  "membership_type",
  "membership_date",
  "retiree_status",
  "beneficiary_1_full_name",
  "beneficiary_2_full_name",
];

const REQUIRED_HEADERS = ["surname", "first_name", "birthdate"];
const DATE_HEADERS = ["birthdate", "date_of_regular_appointment", "membership_date"];
const DATA_START_ROW = 2;
const MAX_DATA_ROWS = 2000;
const MEMBER_SHEET_NAME = "Member Profile";
const LOAN_SHEET_NAME = "Loan Import";
const LOAN_HEADERS = [
  "member_name",
  "loan_start",
  "principal",
  "interest",
  "principal_balance_before_recent_payment",
  "interest_balance_before_recent_payment",
  "recent_principal_payment",
  "recent_interest_payment",
  "recent_principal_balance",
  "recent_interest_balance",
  "recent_balance_month",
];

// Mirrors the system's OfficeSeeder.php (Active offices only) — used to seed
// the "Offices" sheet the first time it's created. Update this list by hand
// if the seeder changes; existing "Offices" sheets are never overwritten
// since admins are expected to add further office names there themselves.
const SEEDED_OFFICE_NAMES = [
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
  // Reuse the user's existing Member Profile sheet. Never create a second
  // "Member Profile Import" tab when a Member Profile tab already exists.
  const sheet = spreadsheet.getSheetByName(MEMBER_SHEET_NAME) || spreadsheet.getActiveSheet();
  if (sheet.getName() !== MEMBER_SHEET_NAME) sheet.setName(MEMBER_SHEET_NAME);

  prepareHeaders_(sheet);
  prepareLayout_(sheet);
  applyFormats_(sheet);
  applyValidations_(sheet, spreadsheet);
  applyRequiredFieldRules_(sheet);
  addHeaderGuidance_(sheet);
  createInstructionsSheet_(spreadsheet);
  createLoanImportSheet_(spreadsheet, sheet);

  SpreadsheetApp.flush();
  spreadsheet.toast(
    "The Member Profile and Loan Import sheets are ready for data entry.",
    "GCGEA Import Template",
    5
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("GCGEA Member Import")
    .addItem("Prepare / Repair Template", "myFunction")
    .addItem("Validate Member Data", "validateMemberData")
    .addItem("Prepare / Repair Loan Import Sheet", "prepareLoanImportSheet")
    .addSeparator()
    .addItem("Clear Data Rows", "clearMemberData")
    .addToUi();
}

function onEdit(event) {
  if (!event || !event.range || event.range.getRow() < DATA_START_ROW) return;

  const sheet = event.range.getSheet();
  const header = String(sheet.getRange(1, event.range.getColumn()).getValue()).trim();
  const range = event.range;

  if (header === "email" && event.value) {
    range.setValue(String(event.value).trim().toLowerCase());
    return;
  }

  if (header === "cellphone_number" && event.value) {
    let phone = String(event.value).replace(/\D/g, "");
    if (phone.startsWith("639") && phone.length === 12) phone = `0${phone.slice(2)}`;
    if (phone.startsWith("9") && phone.length === 10) phone = `0${phone}`;
    range.setNumberFormat("@").setValue(phone);
    return;
  }

  if (DATE_HEADERS.includes(header) && event.value) {
    const date = range.getValue();
    if (date instanceof Date && !isNaN(date.getTime())) {
      range.setNumberFormat("yyyy-mm-dd");
    }
  }
}

function prepareLoanImportSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const memberSheet = spreadsheet.getSheetByName(MEMBER_SHEET_NAME);
  if (!memberSheet) {
    SpreadsheetApp.getUi().alert(`Create or rename the member sheet to "${MEMBER_SHEET_NAME}" first.`);
    return;
  }
  createLoanImportSheet_(spreadsheet, memberSheet);
  spreadsheet.toast("Loan Import now follows the Member Profile rows.", "GCGEA Import Template", 5);
}

function createLoanImportSheet_(spreadsheet, memberSheet) {
  let sheet = spreadsheet.getSheetByName(LOAN_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(LOAN_SHEET_NAME, memberSheet.getIndex());
  if (sheet.getMaxColumns() < LOAN_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), LOAN_HEADERS.length - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < MAX_DATA_ROWS) {
    sheet.insertRowsAfter(sheet.getMaxRows(), MAX_DATA_ROWS - sheet.getMaxRows());
  }

  sheet.getRange(1, 1, 1, LOAN_HEADERS.length).setValues([LOAN_HEADERS])
    .setBackground("#92400E").setFontColor("#FFFFFF").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 48);
  sheet.setColumnWidths(1, LOAN_HEADERS.length, 155);
  sheet.setColumnWidth(1, 220);

  // Reset validations/formats left by older template layouts before applying
  // the compact columns. Only loan_start and recent_balance_month are periods;
  // every principal/interest/payment/balance column is a peso amount.
  sheet.getRange(DATA_START_ROW, 1, MAX_DATA_ROWS - 1, LOAN_HEADERS.length).clearDataValidations();
  sheet.getRange(DATA_START_ROW, 1, MAX_DATA_ROWS - 1, LOAN_HEADERS.length).setNumberFormat("@");
  sheet.getRange(DATA_START_ROW, 2, MAX_DATA_ROWS - 1, 1).setNumberFormat("@");
  sheet.getRange(DATA_START_ROW, 3, MAX_DATA_ROWS - 1, 8).setNumberFormat("#,##0.00");
  sheet.getRange(DATA_START_ROW, 11, MAX_DATA_ROWS - 1, 1).setNumberFormat("@");
  sheet.getRange(DATA_START_ROW, 1, MAX_DATA_ROWS - 1, 11).setBackground("#FFFFFF");

  // Latest balances are derived from the previous balances less the recent
  // payment. Formulas are row-relative and leave truly blank loan rows blank.
  const principalBalanceFormulas = [];
  const interestBalanceFormulas = [];
  for (let row = DATA_START_ROW; row <= MAX_DATA_ROWS; row++) {
    principalBalanceFormulas.push([`=IF(AND(E${row}="",G${row}=""),"",MAX(0,N(E${row})-N(G${row})))`]);
    interestBalanceFormulas.push([`=IF(AND(F${row}="",H${row}=""),"",MAX(0,N(F${row})-N(H${row})))`]);
  }
  sheet.getRange(DATA_START_ROW, 9, MAX_DATA_ROWS - 1, 1).setFormulas(principalBalanceFormulas);
  sheet.getRange(DATA_START_ROW, 10, MAX_DATA_ROWS - 1, 1).setFormulas(interestBalanceFormulas);
  sheet.getRange(DATA_START_ROW, 9, MAX_DATA_ROWS - 1, 2).setBackground("#ECFDF5");

  const periodRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=OR(B2="",REGEXMATCH(TO_TEXT(B2),"^[0-9]{4}-(0[1-9]|1[0-2])$"))')
    .setAllowInvalid(false).setHelpText("Use YYYY-MM, for example 2025-07.").build();
  sheet.getRange(DATA_START_ROW, 2, MAX_DATA_ROWS - 1, 1).setDataValidation(periodRule);
  const balancePeriodRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=OR(K2="",REGEXMATCH(TO_TEXT(K2),"^[0-9]{4}-(0[1-9]|1[0-2])$"))')
    .setAllowInvalid(false).setHelpText("Use YYYY-MM for the latest balance month.").build();
  sheet.getRange(DATA_START_ROW, 11, MAX_DATA_ROWS - 1, 1).setDataValidation(balancePeriodRule);

  const notes = {
    member_name: "Paste the client's full name here. Preview Import will match it against registered system members.",
    loan_start: "REQUIRED for a loan. Use YYYY-MM.",
    principal: "Original loanable amount, e.g. 20000.",
    interest: "Original total interest, e.g. 7200.",
    principal_balance_before_recent_payment: "Balance BEFORE the recent payment. For January-2026.xlsx, copy PRINCIPAL BALANCE as of December 2025 (column F), not the January balance.",
    interest_balance_before_recent_payment: "Interest balance BEFORE the recent payment. For January-2026.xlsx, copy INTEREST as of December 2025 (column G), not the January balance.",
    recent_principal_payment: "Principal paid in the recent month.",
    recent_interest_payment: "Interest paid in the recent month.",
    recent_principal_balance: "AUTOMATIC: previous principal balance minus recent principal payment.",
    recent_interest_balance: "AUTOMATIC: previous interest balance minus recent interest payment.",
    recent_balance_month: "Month of the latest balance/payment in YYYY-MM.",
  };
  LOAN_HEADERS.forEach((header, index) => sheet.getRange(1, index + 1).setNote(notes[header]));

  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, Math.max(2, sheet.getLastRow()), LOAN_HEADERS.length).createFilter();
}

function validateMemberData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) {
    SpreadsheetApp.getUi().alert("No member rows were found.");
    return;
  }

  const headerMap = getHeaderMap_(sheet);
  const values = sheet
    .getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, MEMBER_HEADERS.length)
    .getDisplayValues();

  const errors = [];
  values.forEach((row, index) => {
    const sheetRow = index + DATA_START_ROW;
    if (row.every((value) => !String(value).trim())) return;

    REQUIRED_HEADERS.forEach((header) => {
      if (!String(row[headerMap[header] - 1] || "").trim()) {
        errors.push(`Row ${sheetRow}: ${header} is required.`);
      }
    });

    const email = String(row[headerMap.email - 1] || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${sheetRow}: email format is invalid.`);
    }

    const phone = String(row[headerMap.cellphone_number - 1] || "").trim();
    if (phone && !/^09\d{9}$/.test(phone)) {
      errors.push(`Row ${sheetRow}: cellphone_number must use 09XXXXXXXXX.`);
    }
  });

  if (!errors.length) {
    SpreadsheetApp.getUi().alert("Validation successful. The sheet is ready for CSV export.");
    return;
  }

  const visibleErrors = errors.slice(0, 50);
  const suffix = errors.length > 50 ? `\n\n...and ${errors.length - 50} more issue(s).` : "";
  SpreadsheetApp.getUi().alert(`Please correct the following:\n\n${visibleErrors.join("\n")}${suffix}`);
}

function clearMemberData() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.alert(
    "Clear member data?",
    "This clears data from row 2 downward but keeps headers, formatting, and validation.",
    ui.ButtonSet.YES_NO
  );
  if (answer !== ui.Button.YES) return;

  const sheet = SpreadsheetApp.getActiveSheet();
  const rows = Math.max(1, sheet.getMaxRows() - 1);
  sheet.getRange(DATA_START_ROW, 1, rows, MEMBER_HEADERS.length).clearContent();
}

function prepareHeaders_(sheet) {
  if (sheet.getMaxColumns() < MEMBER_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), MEMBER_HEADERS.length - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < MAX_DATA_ROWS) {
    sheet.insertRowsAfter(sheet.getMaxRows(), MAX_DATA_ROWS - sheet.getMaxRows());
  }

  sheet.getRange(1, 1, 1, MEMBER_HEADERS.length).setValues([MEMBER_HEADERS]);
  sheet.setFrozenRows(1);
}

function prepareLayout_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, MEMBER_HEADERS.length);
  headerRange
    .setBackground("#1E3A8A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);

  sheet.setRowHeight(1, 42);
  sheet.setColumnWidths(1, MEMBER_HEADERS.length, 145);
  sheet.setColumnWidth(7, 135);
  sheet.setColumnWidth(8, 230);
  sheet.setColumnWidth(9, 190);
  sheet.setColumnWidth(10, 190);
  sheet.setColumnWidth(11, 190);
  sheet.setColumnWidth(16, 210);
  sheet.setColumnWidth(17, 210);

  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, Math.max(2, sheet.getLastRow()), MEMBER_HEADERS.length).createFilter();
  sheet.getRange(DATA_START_ROW, 1, MAX_DATA_ROWS - 1, MEMBER_HEADERS.length)
    .setVerticalAlignment("middle")
    .setWrap(true);
}

function applyFormats_(sheet) {
  const headerMap = getHeaderMap_(sheet);
  DATE_HEADERS.forEach((header) => {
    sheet
      .getRange(DATA_START_ROW, headerMap[header], MAX_DATA_ROWS - 1, 1)
      .setNumberFormat("yyyy-mm-dd");
  });
  sheet
    .getRange(DATA_START_ROW, headerMap.cellphone_number, MAX_DATA_ROWS - 1, 1)
    .setNumberFormat("@");
}

function applyValidations_(sheet, spreadsheet) {
  const headerMap = getHeaderMap_(sheet);
  setListValidation_(sheet, headerMap.sex, ["Male", "Female"], "Select Male or Female.");
  setListValidation_(
    sheet,
    headerMap.membership_type,
    ["Regular", "Associate", "Honorary"],
    "Select a valid membership type."
  );
  setListValidation_(
    sheet,
    headerMap.retiree_status,
    ["Not Retired", "Retired"],
    "Select the member's retirement status."
  );

  DATE_HEADERS.forEach((header) => {
    const rule = SpreadsheetApp.newDataValidation()
      .requireDateOnOrBefore(new Date())
      .setAllowInvalid(false)
      .setHelpText("Select a valid date that is not later than today.")
      .build();
    sheet.getRange(DATA_START_ROW, headerMap[header], MAX_DATA_ROWS - 1, 1).setDataValidation(rule);
  });

  const emailRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=OR(F2="",REGEXMATCH(F2,"^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))')
    .setAllowInvalid(false)
    .setHelpText("Enter a valid email address or leave the cell blank.")
    .build();
  sheet.getRange(DATA_START_ROW, headerMap.email, MAX_DATA_ROWS - 1, 1).setDataValidation(emailRule);

  const phoneRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=OR(G2="",REGEXMATCH(TO_TEXT(G2),"^09[0-9]{9}$"))')
    .setAllowInvalid(false)
    .setHelpText("Use the Philippine mobile format 09XXXXXXXXX.")
    .build();
  sheet.getRange(DATA_START_ROW, headerMap.cellphone_number, MAX_DATA_ROWS - 1, 1).setDataValidation(phoneRule);

  const officeSheet = getOrCreateOfficeSheet_(spreadsheet);
  const officeRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(officeSheet.getRange("A2:A"), true)
    .setAllowInvalid(true)
    .setHelpText("Select an existing office or add the office name to the Offices sheet.")
    .build();
  sheet.getRange(DATA_START_ROW, headerMap.office_name, MAX_DATA_ROWS - 1, 1).setDataValidation(officeRule);
}

function applyRequiredFieldRules_(sheet) {
  const headerMap = getHeaderMap_(sheet);
  const rules = sheet.getConditionalFormatRules().filter((rule) => {
    const ranges = rule.getRanges();
    return !ranges.some((range) => range.getSheet().getSheetId() === sheet.getSheetId());
  });

  REQUIRED_HEADERS.forEach((header) => {
    const column = headerMap[header];
    const range = sheet.getRange(DATA_START_ROW, column, MAX_DATA_ROWS - 1, 1);
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND(COUNTA($A2:$Q2)>0,${columnLetter_(column)}2="")`)
        .setBackground("#FEE2E2")
        .setFontColor("#B91C1C")
        .setRanges([range])
        .build()
    );
  });
  sheet.setConditionalFormatRules(rules);
}

function addHeaderGuidance_(sheet) {
  const notes = {
    surname: "REQUIRED. Member's family name.",
    first_name: "REQUIRED. Member's given name.",
    middle_name: "Optional. Leave blank if unavailable.",
    birthdate: "REQUIRED. Select a date; displayed as YYYY-MM-DD.",
    sex: "Choose Male or Female.",
    email: "Optional. Must be a valid email address.",
    cellphone_number: "Optional. Use 09XXXXXXXXX.",
    permanent_address: "Member's complete permanent address.",
    name_of_spouse: "Optional. Leave blank when not applicable.",
    office_name: "Use an office from the Offices sheet for automatic matching.",
    position: "Current occupation or government position.",
    date_of_regular_appointment: "Select a date; displayed as YYYY-MM-DD.",
    membership_type: "Choose Regular, Associate, or Honorary.",
    membership_date: "Select the GCGEA membership date; displayed as YYYY-MM-DD.",
    retiree_status: "Choose Not Retired or Retired.",
    beneficiary_1_full_name: "Optional. Enter one complete beneficiary name.",
    beneficiary_2_full_name: "Optional. Enter one complete beneficiary name.",
  };
  MEMBER_HEADERS.forEach((header, index) => sheet.getRange(1, index + 1).setNote(notes[header] || ""));
}

function createInstructionsSheet_(spreadsheet) {
  const name = "Import Instructions";
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  sheet.clear();

  const rows = [
    ["GCGEA Member Profile Import Guidelines", ""],
    ["Required fields", "surname, first_name, and birthdate"],
    ["Date format", "Use the date picker. Dates are displayed as YYYY-MM-DD."],
    ["Cellphone", "Use 09XXXXXXXXX."],
    ["Office", "Select a value maintained in the Offices sheet."],
    ["One member per row", "Do not combine multiple members in one row or cell."],
    ["Beneficiaries", "Enter one full name in each beneficiary column."],
    ["Documents", "Upload documents separately from the member profile after import."],
    ["System fields", "Do not add IDs, member numbers, approval fields, or timestamps."],
    ["Before export", "Run GCGEA Member Import → Validate Member Data."],
    ["Export", "File → Download → Comma-separated values (.csv)."],
  ];
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange("A1:B1").merge().setBackground("#1E3A8A").setFontColor("#FFFFFF").setFontWeight("bold");
  sheet.setColumnWidth(1, 170);
  sheet.setColumnWidth(2, 520);
  sheet.getRange(1, 1, rows.length, 2).setWrap(true).setVerticalAlignment("top");
  sheet.setFrozenRows(1);
}

function getOrCreateOfficeSheet_(spreadsheet) {
  const name = "Offices";
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange("A1").setValue("office_name").setBackground("#1E3A8A").setFontColor("#FFFFFF").setFontWeight("bold");
    sheet.getRange(2, 1, SEEDED_OFFICE_NAMES.length, 1).setValues(SEEDED_OFFICE_NAMES.map((officeName) => [officeName]));
    sheet.setColumnWidth(1, 300);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function setListValidation_(sheet, column, values, helpText) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .setHelpText(helpText)
    .build();
  sheet.getRange(DATA_START_ROW, column, MAX_DATA_ROWS - 1, 1).setDataValidation(rule);
}

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, MEMBER_HEADERS.length).getDisplayValues()[0];
  return headers.reduce((map, header, index) => {
    map[String(header).trim()] = index + 1;
    return map;
  }, {});
}

function columnLetter_(column) {
  let letter = "";
  while (column > 0) {
    const remainder = (column - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    column = Math.floor((column - 1) / 26);
  }
  return letter;
}
