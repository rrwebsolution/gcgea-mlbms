/**
 * Curated Philippine location reference data for the Present Address search
 * selector. Covers major cities/municipalities per province across all
 * regions — not the full ~1,634 PSGC city/municipality list, which is out of
 * scope for a bundled frontend dataset. Barangay/street level stays free
 * text on the form; this dataset resolves City/Municipality + Province.
 */
export interface PhLocation {
  region: string
  province: string
  cityMunicipality: string
}

export const PH_LOCATIONS: PhLocation[] = [
  // NCR
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Manila" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Quezon City" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Caloocan" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Las Piñas" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Makati" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Malabon" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Mandaluyong" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Marikina" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Muntinlupa" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Navotas" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Parañaque" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Pasay" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Pasig" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "San Juan" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Taguig" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Valenzuela" },
  { region: "NCR", province: "Metro Manila", cityMunicipality: "Pateros" },

  // CAR
  { region: "CAR", province: "Benguet", cityMunicipality: "Baguio" },
  { region: "CAR", province: "Benguet", cityMunicipality: "La Trinidad" },
  { region: "CAR", province: "Benguet", cityMunicipality: "Itogon" },
  { region: "CAR", province: "Abra", cityMunicipality: "Bangued" },
  { region: "CAR", province: "Apayao", cityMunicipality: "Kabugao" },
  { region: "CAR", province: "Ifugao", cityMunicipality: "Lagawe" },
  { region: "CAR", province: "Ifugao", cityMunicipality: "Banaue" },
  { region: "CAR", province: "Kalinga", cityMunicipality: "Tabuk" },
  { region: "CAR", province: "Mountain Province", cityMunicipality: "Bontoc" },
  { region: "CAR", province: "Mountain Province", cityMunicipality: "Sagada" },

  // Region I – Ilocos Region
  { region: "Region I", province: "Ilocos Norte", cityMunicipality: "Laoag" },
  { region: "Region I", province: "Ilocos Norte", cityMunicipality: "Batac" },
  { region: "Region I", province: "Ilocos Norte", cityMunicipality: "Pagudpud" },
  { region: "Region I", province: "Ilocos Sur", cityMunicipality: "Vigan" },
  { region: "Region I", province: "Ilocos Sur", cityMunicipality: "Candon" },
  { region: "Region I", province: "Ilocos Sur", cityMunicipality: "Tagudin" },
  { region: "Region I", province: "Ilocos Sur", cityMunicipality: "Narvacan" },
  { region: "Region I", province: "La Union", cityMunicipality: "San Fernando" },
  { region: "Region I", province: "La Union", cityMunicipality: "Agoo" },
  { region: "Region I", province: "La Union", cityMunicipality: "Bauang" },
  { region: "Region I", province: "Pangasinan", cityMunicipality: "Dagupan" },
  { region: "Region I", province: "Pangasinan", cityMunicipality: "Alaminos" },
  { region: "Region I", province: "Pangasinan", cityMunicipality: "San Carlos" },
  { region: "Region I", province: "Pangasinan", cityMunicipality: "Urdaneta" },
  { region: "Region I", province: "Pangasinan", cityMunicipality: "Lingayen" },

  // Region II – Cagayan Valley
  { region: "Region II", province: "Batanes", cityMunicipality: "Basco" },
  { region: "Region II", province: "Cagayan", cityMunicipality: "Tuguegarao" },
  { region: "Region II", province: "Cagayan", cityMunicipality: "Aparri" },
  { region: "Region II", province: "Cagayan", cityMunicipality: "Gonzaga" },
  { region: "Region II", province: "Isabela", cityMunicipality: "Ilagan" },
  { region: "Region II", province: "Isabela", cityMunicipality: "Cauayan" },
  { region: "Region II", province: "Isabela", cityMunicipality: "Santiago" },
  { region: "Region II", province: "Nueva Vizcaya", cityMunicipality: "Bayombong" },
  { region: "Region II", province: "Nueva Vizcaya", cityMunicipality: "Solano" },
  { region: "Region II", province: "Quirino", cityMunicipality: "Cabarroguis" },

  // Region III – Central Luzon
  { region: "Region III", province: "Aurora", cityMunicipality: "Baler" },
  { region: "Region III", province: "Bataan", cityMunicipality: "Balanga" },
  { region: "Region III", province: "Bataan", cityMunicipality: "Mariveles" },
  { region: "Region III", province: "Bulacan", cityMunicipality: "Malolos" },
  { region: "Region III", province: "Bulacan", cityMunicipality: "Meycauayan" },
  { region: "Region III", province: "Bulacan", cityMunicipality: "San Jose del Monte" },
  { region: "Region III", province: "Bulacan", cityMunicipality: "Baliuag" },
  { region: "Region III", province: "Nueva Ecija", cityMunicipality: "Cabanatuan" },
  { region: "Region III", province: "Nueva Ecija", cityMunicipality: "Palayan" },
  { region: "Region III", province: "Nueva Ecija", cityMunicipality: "Gapan" },
  { region: "Region III", province: "Nueva Ecija", cityMunicipality: "San Jose City" },
  { region: "Region III", province: "Pampanga", cityMunicipality: "San Fernando" },
  { region: "Region III", province: "Pampanga", cityMunicipality: "Angeles" },
  { region: "Region III", province: "Pampanga", cityMunicipality: "Mabalacat" },
  { region: "Region III", province: "Tarlac", cityMunicipality: "Tarlac City" },
  { region: "Region III", province: "Tarlac", cityMunicipality: "Capas" },
  { region: "Region III", province: "Zambales", cityMunicipality: "Iba" },
  { region: "Region III", province: "Zambales", cityMunicipality: "Olongapo" },
  { region: "Region III", province: "Zambales", cityMunicipality: "Subic" },

  // Region IV-A – CALABARZON
  { region: "Region IV-A", province: "Batangas", cityMunicipality: "Batangas City" },
  { region: "Region IV-A", province: "Batangas", cityMunicipality: "Lipa" },
  { region: "Region IV-A", province: "Batangas", cityMunicipality: "Tanauan" },
  { region: "Region IV-A", province: "Batangas", cityMunicipality: "Sto. Tomas" },
  { region: "Region IV-A", province: "Cavite", cityMunicipality: "Trece Martires" },
  { region: "Region IV-A", province: "Cavite", cityMunicipality: "Dasmariñas" },
  { region: "Region IV-A", province: "Cavite", cityMunicipality: "Bacoor" },
  { region: "Region IV-A", province: "Cavite", cityMunicipality: "Imus" },
  { region: "Region IV-A", province: "Cavite", cityMunicipality: "Tagaytay" },
  { region: "Region IV-A", province: "Cavite", cityMunicipality: "General Trias" },
  { region: "Region IV-A", province: "Laguna", cityMunicipality: "Santa Cruz" },
  { region: "Region IV-A", province: "Laguna", cityMunicipality: "Calamba" },
  { region: "Region IV-A", province: "Laguna", cityMunicipality: "San Pablo" },
  { region: "Region IV-A", province: "Laguna", cityMunicipality: "Los Baños" },
  { region: "Region IV-A", province: "Laguna", cityMunicipality: "Santa Rosa" },
  { region: "Region IV-A", province: "Quezon", cityMunicipality: "Lucena" },
  { region: "Region IV-A", province: "Quezon", cityMunicipality: "Tayabas" },
  { region: "Region IV-A", province: "Quezon", cityMunicipality: "Lucban" },
  { region: "Region IV-A", province: "Rizal", cityMunicipality: "Antipolo" },
  { region: "Region IV-A", province: "Rizal", cityMunicipality: "Taytay" },
  { region: "Region IV-A", province: "Rizal", cityMunicipality: "Cainta" },

  // MIMAROPA
  { region: "MIMAROPA", province: "Marinduque", cityMunicipality: "Boac" },
  { region: "MIMAROPA", province: "Occidental Mindoro", cityMunicipality: "Mamburao" },
  { region: "MIMAROPA", province: "Occidental Mindoro", cityMunicipality: "San Jose" },
  { region: "MIMAROPA", province: "Oriental Mindoro", cityMunicipality: "Calapan" },
  { region: "MIMAROPA", province: "Oriental Mindoro", cityMunicipality: "Puerto Galera" },
  { region: "MIMAROPA", province: "Palawan", cityMunicipality: "Puerto Princesa" },
  { region: "MIMAROPA", province: "Palawan", cityMunicipality: "Coron" },
  { region: "MIMAROPA", province: "Palawan", cityMunicipality: "El Nido" },
  { region: "MIMAROPA", province: "Romblon", cityMunicipality: "Romblon" },
  { region: "MIMAROPA", province: "Romblon", cityMunicipality: "Odiongan" },

  // Region V – Bicol Region
  { region: "Region V", province: "Albay", cityMunicipality: "Legazpi" },
  { region: "Region V", province: "Albay", cityMunicipality: "Tabaco" },
  { region: "Region V", province: "Albay", cityMunicipality: "Ligao" },
  { region: "Region V", province: "Camarines Norte", cityMunicipality: "Daet" },
  { region: "Region V", province: "Camarines Sur", cityMunicipality: "Naga" },
  { region: "Region V", province: "Camarines Sur", cityMunicipality: "Iriga" },
  { region: "Region V", province: "Camarines Sur", cityMunicipality: "Pili" },
  { region: "Region V", province: "Catanduanes", cityMunicipality: "Virac" },
  { region: "Region V", province: "Masbate", cityMunicipality: "Masbate City" },
  { region: "Region V", province: "Sorsogon", cityMunicipality: "Sorsogon City" },
  { region: "Region V", province: "Sorsogon", cityMunicipality: "Bulan" },

  // Region VI – Western Visayas
  { region: "Region VI", province: "Aklan", cityMunicipality: "Kalibo" },
  { region: "Region VI", province: "Aklan", cityMunicipality: "Boracay (Malay)" },
  { region: "Region VI", province: "Antique", cityMunicipality: "San Jose de Buenavista" },
  { region: "Region VI", province: "Capiz", cityMunicipality: "Roxas City" },
  { region: "Region VI", province: "Guimaras", cityMunicipality: "Jordan" },
  { region: "Region VI", province: "Iloilo", cityMunicipality: "Iloilo City" },
  { region: "Region VI", province: "Iloilo", cityMunicipality: "Passi" },
  { region: "Region VI", province: "Negros Occidental", cityMunicipality: "Bacolod" },
  { region: "Region VI", province: "Negros Occidental", cityMunicipality: "Silay" },
  { region: "Region VI", province: "Negros Occidental", cityMunicipality: "Kabankalan" },
  { region: "Region VI", province: "Negros Occidental", cityMunicipality: "Sagay" },

  // Region VII – Central Visayas
  { region: "Region VII", province: "Cebu", cityMunicipality: "Cebu City" },
  { region: "Region VII", province: "Cebu", cityMunicipality: "Mandaue" },
  { region: "Region VII", province: "Cebu", cityMunicipality: "Lapu-Lapu" },
  { region: "Region VII", province: "Cebu", cityMunicipality: "Talisay" },
  { region: "Region VII", province: "Cebu", cityMunicipality: "Toledo" },
  { region: "Region VII", province: "Cebu", cityMunicipality: "Danao" },
  { region: "Region VII", province: "Cebu", cityMunicipality: "Carcar" },
  { region: "Region VII", province: "Bohol", cityMunicipality: "Tagbilaran" },
  { region: "Region VII", province: "Bohol", cityMunicipality: "Panglao" },
  { region: "Region VII", province: "Negros Oriental", cityMunicipality: "Dumaguete" },
  { region: "Region VII", province: "Negros Oriental", cityMunicipality: "Bais" },
  { region: "Region VII", province: "Siquijor", cityMunicipality: "Siquijor" },

  // Region VIII – Eastern Visayas
  { region: "Region VIII", province: "Biliran", cityMunicipality: "Naval" },
  { region: "Region VIII", province: "Eastern Samar", cityMunicipality: "Borongan" },
  { region: "Region VIII", province: "Leyte", cityMunicipality: "Tacloban" },
  { region: "Region VIII", province: "Leyte", cityMunicipality: "Ormoc" },
  { region: "Region VIII", province: "Leyte", cityMunicipality: "Baybay" },
  { region: "Region VIII", province: "Northern Samar", cityMunicipality: "Catarman" },
  { region: "Region VIII", province: "Samar", cityMunicipality: "Catbalogan" },
  { region: "Region VIII", province: "Samar", cityMunicipality: "Calbayog" },
  { region: "Region VIII", province: "Southern Leyte", cityMunicipality: "Maasin" },

  // Region IX – Zamboanga Peninsula
  { region: "Region IX", province: "Zamboanga del Norte", cityMunicipality: "Dipolog" },
  { region: "Region IX", province: "Zamboanga del Norte", cityMunicipality: "Dapitan" },
  { region: "Region IX", province: "Zamboanga del Sur", cityMunicipality: "Pagadian" },
  { region: "Region IX", province: "Zamboanga del Sur", cityMunicipality: "Zamboanga City" },
  { region: "Region IX", province: "Zamboanga Sibugay", cityMunicipality: "Ipil" },

  // Region X – Northern Mindanao
  { region: "Region X", province: "Bukidnon", cityMunicipality: "Malaybalay" },
  { region: "Region X", province: "Bukidnon", cityMunicipality: "Valencia" },
  { region: "Region X", province: "Camiguin", cityMunicipality: "Mambajao" },
  { region: "Region X", province: "Lanao del Norte", cityMunicipality: "Tubod" },
  { region: "Region X", province: "Lanao del Norte", cityMunicipality: "Iligan" },
  { region: "Region X", province: "Misamis Occidental", cityMunicipality: "Oroquieta" },
  { region: "Region X", province: "Misamis Occidental", cityMunicipality: "Ozamiz" },
  { region: "Region X", province: "Misamis Occidental", cityMunicipality: "Tangub" },
  { region: "Region X", province: "Misamis Oriental", cityMunicipality: "Cagayan de Oro" },
  { region: "Region X", province: "Misamis Oriental", cityMunicipality: "Gingoog" },
  { region: "Region X", province: "Misamis Oriental", cityMunicipality: "Tagoloan" },
  { region: "Region X", province: "Misamis Oriental", cityMunicipality: "El Salvador" },
  { region: "Region X", province: "Misamis Oriental", cityMunicipality: "Villanueva" },

  // Region XI – Davao Region
  { region: "Region XI", province: "Davao de Oro", cityMunicipality: "Nabunturan" },
  { region: "Region XI", province: "Davao del Norte", cityMunicipality: "Tagum" },
  { region: "Region XI", province: "Davao del Norte", cityMunicipality: "Panabo" },
  { region: "Region XI", province: "Davao del Norte", cityMunicipality: "Samal" },
  { region: "Region XI", province: "Davao del Sur", cityMunicipality: "Davao City" },
  { region: "Region XI", province: "Davao del Sur", cityMunicipality: "Digos" },
  { region: "Region XI", province: "Davao Occidental", cityMunicipality: "Malita" },
  { region: "Region XI", province: "Davao Oriental", cityMunicipality: "Mati" },

  // Region XII – SOCCSKSARGEN
  { region: "Region XII", province: "Cotabato", cityMunicipality: "Kidapawan" },
  { region: "Region XII", province: "Sarangani", cityMunicipality: "Alabel" },
  { region: "Region XII", province: "South Cotabato", cityMunicipality: "Koronadal" },
  { region: "Region XII", province: "South Cotabato", cityMunicipality: "General Santos" },
  { region: "Region XII", province: "South Cotabato", cityMunicipality: "Polomolok" },
  { region: "Region XII", province: "Sultan Kudarat", cityMunicipality: "Isulan" },
  { region: "Region XII", province: "Sultan Kudarat", cityMunicipality: "Tacurong" },

  // Region XIII – Caraga
  { region: "Region XIII", province: "Agusan del Norte", cityMunicipality: "Butuan" },
  { region: "Region XIII", province: "Agusan del Norte", cityMunicipality: "Cabadbaran" },
  { region: "Region XIII", province: "Agusan del Sur", cityMunicipality: "Bayugan" },
  { region: "Region XIII", province: "Agusan del Sur", cityMunicipality: "Prosperidad" },
  { region: "Region XIII", province: "Dinagat Islands", cityMunicipality: "San Jose" },
  { region: "Region XIII", province: "Surigao del Norte", cityMunicipality: "Surigao City" },
  { region: "Region XIII", province: "Surigao del Sur", cityMunicipality: "Tandag" },
  { region: "Region XIII", province: "Surigao del Sur", cityMunicipality: "Bislig" },
  { region: "Region XIII", province: "Surigao del Sur", cityMunicipality: "Tagbina" },

  // BARMM
  { region: "BARMM", province: "Basilan", cityMunicipality: "Isabela City" },
  { region: "BARMM", province: "Basilan", cityMunicipality: "Lamitan" },
  { region: "BARMM", province: "Lanao del Sur", cityMunicipality: "Marawi" },
  { region: "BARMM", province: "Maguindanao del Norte", cityMunicipality: "Datu Odin Sinsuat" },
  { region: "BARMM", province: "Maguindanao del Sur", cityMunicipality: "Buluan" },
  { region: "BARMM", province: "Sulu", cityMunicipality: "Jolo" },
  { region: "BARMM", province: "Tawi-Tawi", cityMunicipality: "Bongao" },
]

export function formatLocation(location: PhLocation): string {
  return `${location.cityMunicipality}, ${location.province}`
}

export function searchLocations(query: string, limit = 50): PhLocation[] {
  const term = query.trim().toLowerCase()
  if (!term) return PH_LOCATIONS.slice(0, limit)

  return PH_LOCATIONS.filter(
    (loc) =>
      loc.cityMunicipality.toLowerCase().includes(term) ||
      loc.province.toLowerCase().includes(term) ||
      loc.region.toLowerCase().includes(term)
  ).slice(0, limit)
}
