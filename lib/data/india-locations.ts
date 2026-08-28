// All Indian States and Union Territories with their major districts
// Source: Census of India / Government of India administrative divisions

export interface StateData {
  name: string
  nameHi: string
  districts: string[]
}

export const INDIAN_STATES: StateData[] = [
  {
    name: 'Andhra Pradesh',
    nameHi: 'आंध्र प्रदेश',
    districts: [
      'Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Kadapa', 'Krishna',
      'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam',
      'Vizianagaram', 'West Godavari',
    ],
  },
  {
    name: 'Arunachal Pradesh',
    nameHi: 'अरुणाचल प्रदेश',
    districts: [
      'Anjaw', 'Changlang', 'East Kameng', 'East Siang', 'Itanagar', 'Lohit',
      'Papum Pare', 'Tawang', 'Tirap', 'Upper Siang', 'West Kameng', 'West Siang',
    ],
  },
  {
    name: 'Assam',
    nameHi: 'असम',
    districts: [
      'Baksa', 'Barpeta', 'Cachar', 'Darrang', 'Dhubri', 'Dibrugarh',
      'Goalpara', 'Golaghat', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan',
      'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Nagaon',
      'Nalbari', 'Sivasagar', 'Sonitpur', 'Tinsukia',
    ],
  },
  {
    name: 'Bihar',
    nameHi: 'बिहार',
    districts: [
      'Araria', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur',
      'Buxar', 'Darbhanga', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad',
      'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Madhepura', 'Madhubani',
      'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia',
      'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sitamarhi',
      'Siwan', 'Supaul', 'Vaishali', 'West Champaran', 'East Champaran',
    ],
  },
  {
    name: 'Chhattisgarh',
    nameHi: 'छत्तीसगढ़',
    districts: [
      'Bastar', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg',
      'Janjgir-Champa', 'Jashpur', 'Kanker', 'Korba', 'Koriya', 'Mahasamund',
      'Raigarh', 'Raipur', 'Rajnandgaon', 'Surguja',
    ],
  },
  {
    name: 'Goa',
    nameHi: 'गोवा',
    districts: ['North Goa', 'South Goa'],
  },
  {
    name: 'Gujarat',
    nameHi: 'गुजरात',
    districts: [
      'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch',
      'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka',
      'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kutch',
      'Kheda', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari',
      'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha',
      'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad',
    ],
  },
  {
    name: 'Haryana',
    nameHi: 'हरियाणा',
    districts: [
      'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram',
      'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra',
      'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari',
      'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar',
    ],
  },
  {
    name: 'Himachal Pradesh',
    nameHi: 'हिमाचल प्रदेश',
    districts: [
      'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu',
      'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una',
    ],
  },
  {
    name: 'Jharkhand',
    nameHi: 'झारखंड',
    districts: [
      'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum',
      'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara',
      'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu',
      'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega',
      'West Singhbhum',
    ],
  },
  {
    name: 'Karnataka',
    nameHi: 'कर्नाटक',
    districts: [
      'Bagalkot', 'Bangalore Rural', 'Bangalore Urban', 'Belgaum', 'Bellary',
      'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
      'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Gulbarga',
      'Hassan', 'Haveri', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysore',
      'Raichur', 'Ramanagara', 'Shimoga', 'Tumkur', 'Udupi', 'Uttara Kannada',
      'Yadgir',
    ],
  },
  {
    name: 'Kerala',
    nameHi: 'केरल',
    districts: [
      'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam',
      'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
      'Thiruvananthapuram', 'Thrissur', 'Wayanad',
    ],
  },
  {
    name: 'Madhya Pradesh',
    nameHi: 'मध्य प्रदेश',
    districts: [
      'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani',
      'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara',
      'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior',
      'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni',
      'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur',
      'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar',
      'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri',
      'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha',
    ],
  },
  {
    name: 'Maharashtra',
    nameHi: 'महाराष्ट्र',
    districts: [
      'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara',
      'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli',
      'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai', 'Mumbai Suburban',
      'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar',
      'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
      'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
    ],
  },
  {
    name: 'Manipur',
    nameHi: 'मणिपुर',
    districts: [
      'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
      'Senapati', 'Tamenglong', 'Thoubal', 'Ukhrul',
    ],
  },
  {
    name: 'Meghalaya',
    nameHi: 'मेघालय',
    districts: [
      'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills',
      'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills',
      'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills',
    ],
  },
  {
    name: 'Mizoram',
    nameHi: 'मिज़ोरम',
    districts: ['Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Serchhip'],
  },
  {
    name: 'Nagaland',
    nameHi: 'नागालैंड',
    districts: ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
  },
  {
    name: 'Odisha',
    nameHi: 'ओडिशा',
    districts: [
      'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
      'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
      'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar',
      'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh',
      'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh',
    ],
  },
  {
    name: 'Punjab',
    nameHi: 'पंजाब',
    districts: [
      'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka',
      'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
      'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Nawanshahr', 'Pathankot', 'Patiala',
      'Rupnagar', 'Sangrur', 'Tarn Taran',
    ],
  },
  {
    name: 'Rajasthan',
    nameHi: 'राजस्थान',
    districts: [
      'Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara',
      'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur',
      'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu',
      'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand',
      'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur',
    ],
  },
  {
    name: 'Sikkim',
    nameHi: 'सिक्किम',
    districts: ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
  },
  {
    name: 'Tamil Nadu',
    nameHi: 'तमिलनाडु',
    districts: [
      'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
      'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
      'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal',
      'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet',
      'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi',
      'Tiruchirappalli', 'Tirunelveli', 'Tirupattur', 'Tiruvallur', 'Tiruvannamalai',
      'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar',
    ],
  },
  {
    name: 'Telangana',
    nameHi: 'तेलंगाना',
    districts: [
      'Adilabad', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar', 'Jogulamba',
      'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem', 'Mahabubabad',
      'Mahbubnagar', 'Mancherial', 'Medak', 'Medchal', 'Mulugu', 'Nagarkurnool',
      'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli',
      'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet',
      'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri',
    ],
  },
  {
    name: 'Tripura',
    nameHi: 'त्रिपुरा',
    districts: ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
  },
  {
    name: 'Uttar Pradesh',
    nameHi: 'उत्तर प्रदेश',
    districts: [
      'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya',
      'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur',
      'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor',
      'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah',
      'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddh Nagar',
      'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur',
      'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj',
      'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar',
      'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba',
      'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad',
      'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Rae Bareli',
      'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur',
      'Shamli', 'Shrawasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra',
      'Sultanpur', 'Unnao', 'Varanasi',
    ],
  },
  {
    name: 'Uttarakhand',
    nameHi: 'उत्तराखंड',
    districts: [
      'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar',
      'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
      'Udham Singh Nagar', 'Uttarkashi',
    ],
  },
  {
    name: 'West Bengal',
    nameHi: 'पश्चिम बंगाल',
    districts: [
      'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur',
      'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong',
      'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas',
      'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur',
      'Purulia', 'South 24 Parganas', 'Uttar Dinajpur',
    ],
  },
  // Union Territories
  {
    name: 'Andaman and Nicobar Islands',
    nameHi: 'अंडमान और निकोबार द्वीपसमूह',
    districts: ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  },
  {
    name: 'Chandigarh',
    nameHi: 'चंडीगढ़',
    districts: ['Chandigarh'],
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    nameHi: 'दादरा और नगर हवेली और दमन और दीव',
    districts: ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  },
  {
    name: 'Delhi',
    nameHi: 'दिल्ली',
    districts: ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
  },
  {
    name: 'Jammu and Kashmir',
    nameHi: 'जम्मू और कश्मीर',
    districts: [
      'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal',
      'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama',
      'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur',
    ],
  },
  {
    name: 'Ladakh',
    nameHi: 'लद्दाख',
    districts: ['Kargil', 'Leh'],
  },
  {
    name: 'Lakshadweep',
    nameHi: 'लक्षद्वीप',
    districts: ['Lakshadweep'],
  },
  {
    name: 'Puducherry',
    nameHi: 'पुदुचेरी',
    districts: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
  },
]

/** Get all districts for a state */
export function getDistrictsForState(stateName: string): string[] {
  return INDIAN_STATES.find(s => s.name === stateName)?.districts ?? []
}

/** Get all state names as a flat array */
export function getAllStateNames(): string[] {
  return INDIAN_STATES.map(s => s.name)
}

/** Get all districts as a flat sorted array */
export function getAllDistricts(): string[] {
  const allDistricts = INDIAN_STATES.flatMap(s => s.districts)
  return [...new Set(allDistricts)].sort()
}

/** Search districts by prefix */
export function searchDistricts(query: string): string[] {
  const q = query.toLowerCase()
  return getAllDistricts().filter(d => d.toLowerCase().includes(q))
}
