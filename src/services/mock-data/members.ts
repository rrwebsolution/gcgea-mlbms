import type { Member, MembershipStatus, EmploymentStatus, Sex, CivilStatus, RetireeStatus, MembershipType } from "@/types"
import { MOCK_OFFICES } from "./offices"

interface RawMember {
  memberNumber: string
  employeeNumber: string
  surname: string
  firstName: string
  middleName?: string
  suffix?: string
  sex: Sex
  birthdate: string
  civilStatus: CivilStatus
  permanentAddress: string
  cellphoneNumber: string
  email?: string
  nameOfSpouse?: string
  officeCode: string
  position: string
  dateOfRegularAppointment: string
  employmentStatus: EmploymentStatus
  membershipType: MembershipType
  membershipDate: string
  membershipStatus: MembershipStatus
  retireeStatus: RetireeStatus
  remarks?: string
  beneficiaries: { fullName: string; relationship: string; birthdate: string; contactNumber?: string; address?: string; sharePercentage?: number }[]
}

const RAW_MEMBERS: RawMember[] = [
  { memberNumber: "GCGEA-MEM-000001", employeeNumber: "EMP-1042", surname: "Abaquita", firstName: "Rosalinda", middleName: "Cabahug", sex: "Female", birthdate: "1975-03-14", civilStatus: "Married", permanentAddress: "Purok 3, Brgy. Poblacion, Gingoog City", cellphoneNumber: "09171234501", email: "rc.abaquita@gmail.com", nameOfSpouse: "Rogelio Abaquita", officeCode: "CTO", position: "Local Treasury Operations Officer III", dateOfRegularAppointment: "2001-06-01", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2001-08-15", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Rogelio B. Abaquita", relationship: "Spouse", birthdate: "1972-09-20", contactNumber: "09171234599", sharePercentage: 60 }, { fullName: "Rhea Mae Abaquita", relationship: "Daughter", birthdate: "1999-01-11", sharePercentage: 40 }] },
  { memberNumber: "GCGEA-MEM-000002", employeeNumber: "EMP-1108", surname: "Bacus", firstName: "Edwin", middleName: "Torreon", sex: "Male", birthdate: "1968-11-02", civilStatus: "Married", permanentAddress: "Zone 5, Brgy. Agay-ayan, Gingoog City", cellphoneNumber: "09186543201", email: "edwin.bacus@yahoo.com", nameOfSpouse: "Leonora Bacus", officeCode: "CEO", position: "Engineer II", dateOfRegularAppointment: "1998-04-16", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1998-07-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Leonora T. Bacus", relationship: "Spouse", birthdate: "1970-02-18", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000003", employeeNumber: "EMP-0987", surname: "Cagampang", firstName: "Susan", middleName: "Reyes", sex: "Female", birthdate: "1962-07-22", civilStatus: "Widowed", permanentAddress: "Purok 1, Brgy. Cabuyoan, Gingoog City", cellphoneNumber: "09201122334", officeCode: "CHO", position: "Nurse III", dateOfRegularAppointment: "1990-01-10", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1990-05-01", membershipStatus: "Active", retireeStatus: "Retired", remarks: "Retired effective July 2027; processing final benefit claims.", beneficiaries: [{ fullName: "Mark Anthony Cagampang", relationship: "Son", birthdate: "1988-05-30", sharePercentage: 50 }, { fullName: "Grace Cagampang", relationship: "Daughter", birthdate: "1991-10-14", sharePercentage: 50 }] },
  { memberNumber: "GCGEA-MEM-000004", employeeNumber: "EMP-1201", surname: "Dagooc", firstName: "Michael", middleName: "Salcedo", sex: "Male", birthdate: "1985-01-30", civilStatus: "Single", permanentAddress: "Purok 7, Brgy. Consuelo, Gingoog City", cellphoneNumber: "09173344556", email: "michael.dagooc@gmail.com", officeCode: "CPDO", position: "Planning Officer I", dateOfRegularAppointment: "2012-09-03", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2012-10-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Fe S. Dagooc", relationship: "Mother", birthdate: "1958-03-12", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000005", employeeNumber: "EMP-0765", surname: "Estabillo", firstName: "Nenita", middleName: "Villamor", sex: "Female", birthdate: "1970-05-18", civilStatus: "Married", permanentAddress: "Zone 2, Brgy. Kiritingan, Gingoog City", cellphoneNumber: "09159988776", email: "nenita.estabillo@gmail.com", nameOfSpouse: "Carlito Estabillo", officeCode: "CSWDO", position: "Social Welfare Officer II", dateOfRegularAppointment: "1999-02-15", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1999-04-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Carlito V. Estabillo", relationship: "Spouse", birthdate: "1967-08-08", sharePercentage: 70 }, { fullName: "Carl Justin Estabillo", relationship: "Son", birthdate: "2000-12-01", sharePercentage: 30 }] },
  { memberNumber: "GCGEA-MEM-000006", employeeNumber: "EMP-1310", surname: "Flores", firstName: "Ronaldo", middleName: "Buot", sex: "Male", birthdate: "1990-09-09", civilStatus: "Married", permanentAddress: "Purok 4, Brgy. San Antonio, Gingoog City", cellphoneNumber: "09221234567", email: "ronaldo.flores@gmail.com", nameOfSpouse: "Jenny Flores", officeCode: "CEO", position: "Engineering Aide", dateOfRegularAppointment: "2016-06-20", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2016-08-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Jenny B. Flores", relationship: "Spouse", birthdate: "1992-04-04", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000007", employeeNumber: "EMP-0654", surname: "Gimena", firstName: "Purificacion", middleName: "Lao", sex: "Female", birthdate: "1965-12-25", civilStatus: "Married", permanentAddress: "Purok 6, Brgy. Poblacion, Gingoog City", cellphoneNumber: "09187766554", nameOfSpouse: "Antonio Gimena", officeCode: "CACCO", position: "Accountant III", dateOfRegularAppointment: "1993-03-01", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1993-06-01", membershipStatus: "Active", retireeStatus: "Not Retired", remarks: "Incomplete profile: missing email address.", beneficiaries: [{ fullName: "Antonio D. Gimena", relationship: "Spouse", birthdate: "1963-01-05", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000008", employeeNumber: "EMP-1455", surname: "Hallasgo", firstName: "Jocelyn", middleName: "Pino", sex: "Female", birthdate: "1993-04-11", civilStatus: "Single", permanentAddress: "Zone 8, Brgy. Odiongan, Gingoog City", cellphoneNumber: "09334455667", email: "jocelyn.hallasgo@gmail.com", officeCode: "CBO", position: "Budget Officer I", dateOfRegularAppointment: "2019-01-14", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2019-03-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Ederlyn Hallasgo", relationship: "Sister", birthdate: "1990-06-19", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000009", employeeNumber: "EMP-0521", surname: "Ibarra", firstName: "Domingo", middleName: "Suson", sex: "Male", birthdate: "1960-02-02", civilStatus: "Married", permanentAddress: "Purok 2, Brgy. Tinaan, Gingoog City", cellphoneNumber: "09175566778", nameOfSpouse: "Aurora Ibarra", officeCode: "CEO", position: "Engineer IV", dateOfRegularAppointment: "1988-05-16", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1988-09-01", membershipStatus: "Active", retireeStatus: "Retired", remarks: "Retired effective December 2024. Beneficiary of Cash Pabaon 2024.", beneficiaries: [{ fullName: "Aurora S. Ibarra", relationship: "Spouse", birthdate: "1961-11-23", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000010", employeeNumber: "EMP-1522", surname: "Jamora", firstName: "Kristine", middleName: "Añora", sex: "Female", birthdate: "1996-08-27", civilStatus: "Single", permanentAddress: "Purok 9, Brgy. San Isidro, Gingoog City", cellphoneNumber: "09456677889", email: "kristine.jamora@gmail.com", officeCode: "CHRMO", position: "Human Resource Management Assistant", dateOfRegularAppointment: "2021-07-05", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2021-09-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [] },
  { memberNumber: "GCGEA-MEM-000011", employeeNumber: "EMP-0899", surname: "Kho", firstName: "Alfredo", middleName: "Tan", sex: "Male", birthdate: "1978-06-06", civilStatus: "Married", permanentAddress: "Zone 1, Brgy. Poblacion, Gingoog City", cellphoneNumber: "09187788990", email: "alfredo.kho@gmail.com", nameOfSpouse: "Marilou Kho", officeCode: "MO", position: "Administrative Officer IV", dateOfRegularAppointment: "2005-10-17", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2005-12-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Marilou T. Kho", relationship: "Spouse", birthdate: "1980-03-15", sharePercentage: 50 }, { fullName: "Alfred Jr. Kho", relationship: "Son", birthdate: "2006-07-22", sharePercentage: 50 }] },
  { memberNumber: "GCGEA-MEM-000012", employeeNumber: "EMP-1600", surname: "Lacaba", firstName: "Marivic", middleName: "Guanzon", sex: "Female", birthdate: "1988-10-19", civilStatus: "Married", permanentAddress: "Purok 5, Brgy. Cahulogan, Gingoog City", cellphoneNumber: "09228899001", email: "marivic.lacaba@gmail.com", nameOfSpouse: "Renato Lacaba", officeCode: "CSWDO", position: "Social Welfare Assistant", dateOfRegularAppointment: "2014-03-11", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2014-05-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Renato P. Lacaba", relationship: "Spouse", birthdate: "1986-01-01", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000013", employeeNumber: "EMP-0432", surname: "Montañez", firstName: "Federico", middleName: "Oyao", sex: "Male", birthdate: "1958-04-04", civilStatus: "Married", permanentAddress: "Purok 3, Brgy. Agay-ayan, Gingoog City", cellphoneNumber: "09173321456", nameOfSpouse: "Corazon Montañez", officeCode: "CGSO", position: "General Services Officer II", dateOfRegularAppointment: "1985-08-19", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1985-11-01", membershipStatus: "Inactive", retireeStatus: "Retired", remarks: "Retired effective March 2023. Membership status under review.", beneficiaries: [{ fullName: "Corazon L. Montañez", relationship: "Spouse", birthdate: "1960-09-09", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000014", employeeNumber: "EMP-1677", surname: "Nacorda", firstName: "Angeline", middleName: "Bacolod", sex: "Female", birthdate: "1994-12-03", civilStatus: "Single", permanentAddress: "Zone 4, Brgy. Odiongan, Gingoog City", cellphoneNumber: "09339988776", email: "angeline.nacorda@gmail.com", officeCode: "CHO", position: "Midwife II", dateOfRegularAppointment: "2020-02-24", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2020-04-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Bacolod, Elena", relationship: "Mother", birthdate: "1970-07-07", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000015", employeeNumber: "EMP-0345", surname: "Orbeta", firstName: "Wilfredo", middleName: "Cabus", sex: "Male", birthdate: "1963-01-15", civilStatus: "Married", permanentAddress: "Purok 8, Brgy. San Antonio, Gingoog City", cellphoneNumber: "09175512345", email: "wilfredo.orbeta@gmail.com", nameOfSpouse: "Lolita Orbeta", officeCode: "CAGRO", position: "Agriculturist II", dateOfRegularAppointment: "1992-06-08", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1992-09-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Lolita M. Orbeta", relationship: "Spouse", birthdate: "1965-02-28", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000016", employeeNumber: "EMP-1733", surname: "Piñero", firstName: "Charlene", middleName: "Ybañez", sex: "Female", birthdate: "1997-03-08", civilStatus: "Single", permanentAddress: "Purok 1, Brgy. Consuelo, Gingoog City", cellphoneNumber: "09451234598", email: "charlene.pinero@gmail.com", officeCode: "CLO", position: "Legal Assistant", dateOfRegularAppointment: "2022-05-30", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2022-07-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [] },
  { memberNumber: "GCGEA-MEM-000017", employeeNumber: "EMP-0234", surname: "Quiblat", firstName: "Ernesto", middleName: "Dael", sex: "Male", birthdate: "1959-07-01", civilStatus: "Married", permanentAddress: "Zone 6, Brgy. Poblacion, Gingoog City", cellphoneNumber: "09176654321", nameOfSpouse: "Bernadette Quiblat", officeCode: "SP", position: "Sanggunian Member Staff", dateOfRegularAppointment: "1987-01-12", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1987-04-01", membershipStatus: "Active", retireeStatus: "Retired", remarks: "Retired effective January 2026.", beneficiaries: [{ fullName: "Bernadette C. Quiblat", relationship: "Spouse", birthdate: "1961-05-05", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000018", employeeNumber: "EMP-1801", surname: "Rasonabe", firstName: "Katherine", middleName: "Solon", sex: "Female", birthdate: "1999-11-29", civilStatus: "Single", permanentAddress: "Purok 2, Brgy. Kiritingan, Gingoog City", cellphoneNumber: "09667788990", officeCode: "CTO", position: "Revenue Collection Clerk", dateOfRegularAppointment: "2023-08-14", employmentStatus: "Casual", membershipType: "Associate", membershipDate: "2023-09-01", membershipStatus: "Active", retireeStatus: "Not Retired", remarks: "Incomplete profile: missing email address and permanent address details.", beneficiaries: [] },
  { memberNumber: "GCGEA-MEM-000019", employeeNumber: "EMP-0678", surname: "Suico", firstName: "Benjamin", middleName: "Recla", sex: "Male", birthdate: "1972-09-17", civilStatus: "Married", permanentAddress: "Purok 3, Brgy. San Isidro, Gingoog City", cellphoneNumber: "09173456789", email: "benjamin.suico@gmail.com", nameOfSpouse: "Gemma Suico", officeCode: "CDRRMO", position: "Disaster Risk Reduction Officer II", dateOfRegularAppointment: "2000-11-06", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2001-01-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Gemma R. Suico", relationship: "Spouse", birthdate: "1974-08-08", sharePercentage: 60 }, { fullName: "Benjie Jr. Suico", relationship: "Son", birthdate: "2002-10-10", sharePercentage: 40 }] },
  { memberNumber: "GCGEA-MEM-000020", employeeNumber: "EMP-1899", surname: "Tabada", firstName: "Leah", middleName: "Amora", sex: "Female", birthdate: "1991-05-05", civilStatus: "Married", permanentAddress: "Zone 3, Brgy. Cahulogan, Gingoog City", cellphoneNumber: "09228765432", email: "leah.tabada@gmail.com", nameOfSpouse: "Nestor Tabada", officeCode: "CENRO", position: "Environmental Management Specialist I", dateOfRegularAppointment: "2017-10-23", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2017-12-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Nestor D. Tabada", relationship: "Spouse", birthdate: "1989-06-06", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000021", employeeNumber: "EMP-0198", surname: "Uy", firstName: "Roberto", middleName: "Chua", suffix: "Jr.", sex: "Male", birthdate: "1966-02-14", civilStatus: "Married", permanentAddress: "Purok 7, Brgy. Poblacion, Gingoog City", cellphoneNumber: "09175678912", email: "roberto.uy@gmail.com", nameOfSpouse: "Cynthia Uy", officeCode: "CASSO", position: "Assessment Officer II", dateOfRegularAppointment: "1994-09-27", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1994-12-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [{ fullName: "Cynthia M. Uy", relationship: "Spouse", birthdate: "1968-12-12", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000022", employeeNumber: "EMP-1955", surname: "Villaester", firstName: "Sheryl", middleName: "Pabalate", sex: "Female", birthdate: "1995-08-08", civilStatus: "Single", permanentAddress: "Purok 4, Brgy. Odiongan, Gingoog City", cellphoneNumber: "09339876543", email: "sheryl.villaester@gmail.com", officeCode: "CVETO", position: "Veterinary Aide", dateOfRegularAppointment: "2021-04-19", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2021-06-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [] },
  { memberNumber: "GCGEA-MEM-000023", employeeNumber: "EMP-0056", surname: "Yap", firstName: "Cristina", middleName: "Bontuyan", sex: "Female", birthdate: "1957-10-10", civilStatus: "Widowed", permanentAddress: "Zone 7, Brgy. Tinaan, Gingoog City", cellphoneNumber: "09171112233", officeCode: "CIVIL-REG", position: "Civil Registry Officer III", dateOfRegularAppointment: "1983-03-15", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "1983-06-01", membershipStatus: "Active", retireeStatus: "Retired", remarks: "Retired effective October 2024. Cash pabaon released.", beneficiaries: [{ fullName: "Joseph Yap", relationship: "Son", birthdate: "1985-04-25", sharePercentage: 100 }] },
  { memberNumber: "GCGEA-MEM-000024", employeeNumber: "EMP-2011", surname: "Zaragoza", firstName: "Paulo", middleName: "Estoque", sex: "Male", birthdate: "1998-01-21", civilStatus: "Single", permanentAddress: "Purok 6, Brgy. San Antonio, Gingoog City", cellphoneNumber: "09454567891", email: "paulo.zaragoza@gmail.com", officeCode: "TOURISM", position: "Tourism Operations Officer I", dateOfRegularAppointment: "2023-02-06", employmentStatus: "Permanent", membershipType: "Regular", membershipDate: "2023-04-01", membershipStatus: "Active", retireeStatus: "Not Retired", beneficiaries: [] },
]

function officeNameFor(code: string): string {
  return MOCK_OFFICES.find((o) => o.code === code)?.name ?? code
}

export const MOCK_MEMBERS: Member[] = RAW_MEMBERS.map((m, index) => {
  const office = MOCK_OFFICES.find((o) => o.code === m.officeCode)
  const fullName = `${m.surname}${m.suffix ? " " + m.suffix : ""}, ${m.firstName}${m.middleName ? " " + m.middleName : ""}`

  return {
    id: `mem-${String(index + 1).padStart(2, "0")}`,
    memberNumber: m.memberNumber,
    employeeNumber: m.employeeNumber,
    surname: m.surname,
    firstName: m.firstName,
    middleName: m.middleName,
    suffix: m.suffix,
    fullName,
    sex: m.sex,
    birthdate: m.birthdate,
    civilStatus: m.civilStatus,
    permanentAddress: m.permanentAddress,
    cellphoneNumber: m.cellphoneNumber,
    email: m.email,
    nameOfSpouse: m.nameOfSpouse,
    profilePhotoUrl: undefined,

    officeId: office?.id ?? "off-01",
    officeName: officeNameFor(m.officeCode),
    position: m.position,
    dateOfRegularAppointment: m.dateOfRegularAppointment,
    employmentStatus: m.employmentStatus,

    membershipType: m.membershipType,
    membershipDate: m.membershipDate,
    membershipStatus: m.membershipStatus,
    retireeStatus: m.retireeStatus,
    remarks: m.remarks,

    beneficiaries: m.beneficiaries.map((b, bi) => ({
      id: `mem-${String(index + 1).padStart(2, "0")}-ben-${bi + 1}`,
      memberId: `mem-${String(index + 1).padStart(2, "0")}`,
      ...b,
    })),
    documents: index % 3 === 0 ? [
      { id: `mem-${String(index + 1).padStart(2, "0")}-doc-1`, memberId: `mem-${String(index + 1).padStart(2, "0")}`, category: "Valid ID", fileName: `${m.surname}_ValidID.pdf`, fileUrl: "", uploadedAt: m.membershipDate, uploadedBy: "Ana Liza P. Fernandez", fileSize: "482 KB" },
      { id: `mem-${String(index + 1).padStart(2, "0")}-doc-2`, memberId: `mem-${String(index + 1).padStart(2, "0")}`, category: "Membership Form", fileName: `${m.surname}_MembershipForm.pdf`, fileUrl: "", uploadedAt: m.membershipDate, uploadedBy: "Ana Liza P. Fernandez", fileSize: "610 KB" },
    ] : [],

    isArchived: false,
    isDraft: false,
    createdAt: m.membershipDate,
    updatedAt: "2026-06-01",
    createdBy: "Ana Liza P. Fernandez",
  } satisfies Member
})

// Two archived members for the Archived Members view
export const MOCK_ARCHIVED_MEMBERS: Member[] = [
  {
    ...MOCK_MEMBERS[MOCK_MEMBERS.length - 1],
    id: "mem-arch-01",
    memberNumber: "GCGEA-MEM-000025",
    fullName: "Balbuena, Ricardo M.",
    surname: "Balbuena",
    firstName: "Ricardo",
    middleName: "Manreal",
    isArchived: true,
    archivedAt: "2025-08-01",
    archivedReason: "Separated from service (resignation).",
    membershipStatus: "Terminated",
  },
  {
    ...MOCK_MEMBERS[MOCK_MEMBERS.length - 2],
    id: "mem-arch-02",
    memberNumber: "GCGEA-MEM-000026",
    fullName: "Camposano, Elvira T.",
    surname: "Camposano",
    firstName: "Elvira",
    middleName: "Tampus",
    isArchived: true,
    archivedAt: "2025-11-20",
    archivedReason: "Deceased.",
    membershipStatus: "Deceased",
  },
]
