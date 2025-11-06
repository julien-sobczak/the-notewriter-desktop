export const nationalities: Map<string, string> = new Map([
  // Based on https://www.gov.uk/government/publications/nationalities/list-of-nationalities
  // Based on https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2
  ['Albanian', 'AL'], // Albania
  ['Algerian', 'DZ'], // Algeria
  ['Afghan', 'AF'], // Afghanistan
  ['American', 'US'], // United States of America
  ['Andorran', 'AD'], // Andorra
  ['Angolan', 'AO'], // Angola
  ['Anguillan', 'AI'], // Anguilla
  ['Citizen of Antigua and Barbuda', 'AG'], // Antigua and Barbuda
  ['Argentine', 'AR'], // Argentine
  ['Armenian', 'AM'], // Armenia
  ['Australian', 'AU'], // Australia
  ['Austrian', 'AT'], // Austria
  ['Azerbaijani', 'AZ'], // Azerbaijan
  ['Bahamian', 'BS'], // Bahamas
  ['Bahraini', 'BH'], // Bahrain
  ['Bangladeshi', 'BD'], // Bangladesh
  ['Barbadian', 'BB'], // Barbados
  ['Belarusian', 'BY'], // Belarus
  ['Belgian', 'BE'], // Belgium
  ['Belizean', 'BZ'], // Belize
  ['Beninese', 'BJ'], // Benin
  ['Bermudian', 'BM'], // Bermuda
  ['Bhutanese', 'BT'], // Bhutan
  ['Bolivian', 'BO'], // Bolivia
  ['Citizen of Bosnia and Herzegovina', 'BA'], // Bosnia and Herzegovina
  ['Botswanan', 'BW'], // Botswana
  ['Brazilian', 'BR'], // Brazil
  ['British', 'GB'], // United Kingdom
  ['British Virgin Islander', 'VG'], // Virgin Islands (British)
  ['Bruneian', 'BN'], // Brunei
  ['Bulgarian', 'BG'], // Bulgaria
  ['Burkinan', 'BF'], // Burkina Faso
  ['Burmese', 'MM'], // Myanmar
  ['Burundian', 'BI'], // Burundi
  ['Cambodian', 'KH'], // Cambodia
  ['Cameroonian', 'CM'], // Cameroon
  ['Canadian', 'CA'], // Canada
  ['Cape Verdean', 'CV'], // Cabo Verde
  ['Cayman Islander', 'KY'], // Cayman Islands
  ['Central African', 'CF'], // Central African Republic
  ['Chadian', 'TD'], // Chad
  ['Chilean', 'CL'], // Chile
  ['Chinese', 'CN'], // China
  ['Colombian', 'CO'], // Colombia
  ['Comoran', 'KM'], // Comoros
  ['Congolese (Congo)', 'CG'], // Congo
  ['Congolese (DRC)', 'CD'], // Democratic Republic of the Congo
  ['Cook Islander', 'CK'], // Cook Islands
  ['Costa Rican', 'CR'], // Costa Rica
  ['Croatian', 'HR'], // Croatia
  ['Cuban', 'CU'], // Cuba
  ['Cypriot', 'CY'], // Cyprus
  ['Czech', 'CZ'], // Czechia
  ['Danish', 'DK'], // Denmark
  ['Djiboutian', 'DJ'], // Djibouti
  ['Dominican	Citizen of the Dominican Republic', 'DO'], // Dominican Republic
  ['Dutch', 'NL'], // Netherlands
  ['East Timorese', 'TL'], // Timor-Leste
  ['Ecuadorean', 'EC'], // Ecuador
  ['Egyptian', 'EG'], // Egypt
  ['Emirati', 'AE'], // United Arab Emirates
  ['English', 'UK'], // United Kingdom
  ['Equatorial Guinean', 'GQ'], // Equatorial Guinea
  ['Eritrean', 'ER'], // Eritrea
  ['Estonian', 'EE'], // Estonia
  ['Ethiopian', 'ET'], // Ethiopia
  ['Faroese', 'FO'], // Faroe Islands
  ['Fijian', 'FJ'], // Fiji
  ['Filipino', 'PH'], // Philippines
  ['Finnish', 'FI'], // Finland
  ['French', 'FR'], // France
  ['Gabonese', 'GA'], // Gabon
  ['Gambian', 'GM'], // Gambia
  ['Georgian', 'GE'], // Georgia
  ['German', 'DE'], // Germany
  ['Ghanaian', 'GH'], // Ghana
  ['Gibraltarian', 'GI'], // Gibraltar
  ['Greek', 'GR'], // Greece
  ['Greenlandic', 'GL'], // Greenland
  ['Grenadian', 'GD'], // Grenada
  ['Guamanian', 'GU'], // Guam
  ['Guatemalan', 'GT'], // Guatemala
  ['Citizen of Guinea-Bissau', 'GW'], // Guinea-Bissau
  ['Guinean', 'GN'], // Guinea
  ['Guyanese', 'GY'], // Guyana
  ['Haitian', 'HT'], // Haiti
  ['Honduran', 'HN'], // Honduras
  ['Hong Konger', 'HK'], // Hong Kong
  ['Hungarian', 'HU'], // Hungary
  ['Icelandic', 'IS'], // Iceland
  ['Indian', 'IN'], // India
  ['Indonesian', 'ID'], // Indonesia
  ['Iranian', 'IR'], // Iran
  ['Iraqi', 'IQ'], // Iraq
  ['Irish', 'IE'], // Ireland
  ['Israeli', 'IL'], // Israel
  ['Italian', 'IT'], // Italy
  ['Ivorian', 'CI'], // Côte d'Ivoire
  ['Jamaican', 'JM'], // Jamaica
  ['Japanese', 'JP'], // Japan
  ['Jordanian', 'JO'], // Jordan
  ['Kazakh', 'KZ'], // Kazakhstan
  ['Kenyan', 'KE'], // Kenya
  ['Kittitian', 'KN'], // Saint Kitts and Nevis
  ['Citizen of Kiribati', 'KI'], // Kiribati
  ['Kuwaiti', 'KW'], // Kuwait
  ['Kyrgyz', 'KG'], // Kyrgyzstan
  ['Lao', 'LA'], // Lao People's Democratic Republic
  ['Latvian', 'LV'], // Latvia
  ['Lebanese', 'LB'], // Lebanon
  ['Liberian', 'LR'], // Liberia
  ['Libyan', 'LY'], // Libya
  ['Liechtenstein citizen', 'LI'], // Liechtenstein
  ['Lithuanian', 'LT'], // Lithuania
  ['Luxembourger', 'LU'], // Luxembourg
  ['Macanese', 'MO'], // Macao
  ['Macedonian', 'MK'], // North Macedonia
  ['Malagasy', 'MG'], // Madagascar
  ['Malawian', 'MW'], // Malawi
  ['Malaysian', 'MY'], // Malaysia
  ['Maldivian', 'MV'], // Maldives
  ['Malian', 'ML'], // Mali
  ['Maltese', 'MT'], // Malta
  ['Marshallese', 'MH'], // Marshall Islands
  ['Martiniquais', 'MQ'], // Martinique
  ['Mauritanian', 'MR'], // Mauritania
  ['Mauritian', 'MU'], // Mauritius
  ['Mexican', 'MX'], // Mexico
  ['Micronesian', 'FM'], // Micronesia
  ['Moldovan', 'MD'], // Moldova
  ['Monegasque', 'MC'], // Monaco
  ['Mongolian', 'MN'], // Mongolia
  ['Montenegrin', 'ME'], // Montenegro
  ['Montserratian', 'MS'], // Montserrat
  ['Moroccan', 'MA'], // Morocco
  ['Mozambican', 'MZ'], // Mozambique
  ['Namibian', 'NA'], // Namibia
  ['Nauruan', 'NR'], // Nauru
  ['Nepalese', 'NP'], // Nepal
  ['New Zealander', 'NZ'], // New Zealand
  ['Nicaraguan', 'NI'], // Nicaragua
  ['Nigerian', 'NG'], // Nigeria
  ['Nigerien', 'NE'], // Niger
  ['Niuean', 'NZ'], // New Zealand
  ['North Korean', 'KP'], // North Korea
  ['Northern Irish', 'GB'], // Northern Ireland
  ['Norwegian', 'NO'], // Norway
  ['Omani', 'OM'], // Oman
  ['Pakistani', 'PK'], // Pakistan
  ['Palauan', 'PW'], // Palau
  ['Palestinian', 'PS'], // Palestine
  ['Panamanian', 'PA'], // Panama
  ['Papua New Guinean', 'PG'], // Papua New Guinea
  ['Paraguayan', 'PY'], // Paraguay
  ['Peruvian', 'PE'], // Peru
  ['Pitcairn Islander', 'PN'], // Pitcairn
  ['Polish', 'PL'], // Poland
  ['Portuguese', 'PT'], // Portugal
  ['Puerto Rican', 'PR'], // Puerto Rico
  ['Qatari', 'QA'], // Qatar
  ['Romanian', 'RO'], // Romania
  ['Russian', 'RU'], // Russian Federation
  ['Rwandan', 'RW'], // Rwanda
  ['Salvadorean', 'SV'], // El Salvador
  ['Sammarinese', 'SM'], // San Marino
  ['Samoan', 'WS'], // Samoa
  ['Sao Tomean', 'ST'], // Sao Tome and Principe
  ['Saudi Arabian', 'SA'], // Saudi Arabia
  ['Scottish', 'UK'], // Scotland
  ['Senegalese', 'SN'], // Senegal
  ['Serbian', 'RS'], // Serbia
  ['Citizen of Seychelles', 'SC'], // Seychelles
  ['Sierra Leonean', 'SL'], // Sierra Leone
  ['Singaporean', 'SG'], // Singapore
  ['Slovak', 'SK'], // Slovakia
  ['Slovenian', 'SI'], // Slovenia
  ['Solomon Islander', 'SB'], // Solomon Islands
  ['Somali', 'SO'], // Somalia
  ['South African', 'ZA'], // South Africa
  ['South Korean', 'KR'], // South Korea
  ['South Sudanese', 'SS'], // South Sudan
  ['Spanish', 'ES'], // Spain
  ['Sri Lankan', 'LK'], // Sri Lanka
  ['St Helenian', 'SH'], // Saint Helena
  ['St Lucian', 'LC'], // Saint Lucia
  ['Sudanese', 'SD'], // Sudan
  ['Surinamese', 'SR'], // Suriname
  ['Swazi', 'SZ'], // Eswatini
  ['Swedish', 'SE'], // Sweden
  ['Swiss', 'CH'], // Switzerland
  ['Syrian', 'SY'], // Syria
  ['Taiwanese', 'TW'], // Taiwan
  ['Tajik', 'TJ'], // Tajikistan
  ['Tanzanian', 'TZ'], // Tanzania
  ['Thai', 'TH'], // Thailand
  ['Togolese', 'TG'], // Togo
  ['Tongan', 'TO'], // Tonga
  ['Trinidadian', 'TT'], // Trinidad and Tobago
  ['Tunisian', 'TN'], // Tunisia
  ['Turkish', 'TR'], // Türkiye
  ['Turkmen', 'TM'], // Turkmenistan
  ['Turks and Caicos Islander', 'TC'], // Turks and Caicos Islands
  ['Tuvaluan', 'TV'], // Tuvalu
  ['Ugandan', 'UG'], // Uganda
  ['Ukrainian', 'UA'], // Ukraine
  ['Uruguayan', 'UY'], // Uruguay
  ['Uzbek', 'UZ'], // Uzbekistan
  ['Vatican citizen', 'VA'], // Vatican City
  ['Citizen of Vanuatu', 'VU'], // Vanuatu
  ['Venezuelan', 'VE'], // Venezuela
  ['Vietnamese', 'VN'], // Viet Nam
  ['Vincentian', 'VC'], // Saint Vincent and the Grenadines
  ['Wallisian', 'WF'], // Wallis and Futuna
  ['Yemeni', 'YE'], // Yemen
  ['Zambian', 'ZM'], // Zambia
  ['Zimbabwean', 'ZW'], // Zimbabwe

  // + some older nationality
  ['Roman', 'IT'] // Roman Empire
])
