/**
 * Krishi Sewa - Mock Data (same as frontend mock for initial backend seeding)
 * Later persisted via JSON files for orders.
 */

export const products = [
  {
    id: 1,
    name: "Heirloom Tomato Seeds",
    description: "Premium heritage variety 'Crimson Cushion' tomatoes. These seeds produce large, flavorful fruits perfect for fresh eating, canning, and sauces. Non-GMO, open-pollinated, and sourced from our partner seed banks.",
    shortDescription: "Variety: Crimson Cushion • Approx. 50 seeds",
    price: 350,
    originalPrice: 450,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXhpA6l71qyyoxfQpdrqhLwZvle4foCTrFy5L4478wmEE5FUmhmeeKyf1jwNSm5Qf9IJgkQ1IzduXhPqPDXWSo2CALP5cSxgNfH5wfTsmaotvt_nxZGiBtLP4y7zEHlTG93dGHz8qWGEY_4xEZwe13xve889LSj-UiqAZSVD97PaAhOQ",
    category: "seeds",
    tags: ["heirloom", "organic", "non-gmo"],
    inStock: true,
    rating: 4.8,
    reviewCount: 124,
    specifications: {
      "Seed Count": "Approx. 50 seeds",
      "Variety": "Crimson Cushion",
      "Type": "Indeterminate",
      "Days to Maturity": "80-85 days",
      "Sun Requirement": "Full sun (6-8 hours)",
      "Planting Depth": "1/4 inch",
      "Spacing": "24-36 inches",
      "Certification": "Non-GMO, Open Pollinated"
    },
    reviews: [
      { id: 1, author: "Ramesh K.", rating: 5, date: "2024-10-15", text: "Excellent germination rate! Nearly 95% of seeds sprouted within a week. The tomatoes are delicious." },
      { id: 2, author: "Priya S.", rating: 4, date: "2024-09-28", text: "Good quality seeds. Plants are healthy and producing well. Fast delivery too." },
      { id: 3, author: "Arjun P.", rating: 5, date: "2024-09-10", text: "Best heirloom tomatoes I've grown. Rich flavor, beautiful color. Will order again." }
    ]
  },
  {
    id: 2,
    name: "Heritage Marigold Seeds",
    description: "Vibrant heritage marigold variety that acts as a natural pest repellent in your garden. These bright orange and gold flowers not only beautify your space but also protect neighboring plants from nematodes and other pests.",
    shortDescription: "Natural Pest Repellent • Approx. 100 seeds",
    price: 150,
    originalPrice: 180,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAv9l5YKQK7aiMu_5m8C6g5MafSEAiPwFXlvIG8FzAt7zyM-HtASNCtbCbPNRq7JHsBjXstZ1fzLdzXOz-UsIcXAQFHp_AaXnApVERt_mYHk5P0t8OUg08d1DCgyXWOp_BUsLQ5qFyHT9ioibx5ZQTpCloDXxm2Tv6khFIhk-FDlai6JTZ1fGojf5QPsYWVKP8NXlBaeZ3D3bS_OeWTBkW3uocwWkX8rcPDYTbPSBPI9iOgUvifemOUg",
    category: "seeds",
    tags: ["companion planting", "pest control", "pollinator friendly"],
    inStock: true,
    rating: 4.6,
    reviewCount: 89,
    specifications: {
      "Seed Count": "Approx. 100 seeds",
      "Variety": "African Marigold (Tagetes erecta)",
      "Flower Color": "Orange & Gold",
      "Height": "24-36 inches",
      "Bloom Time": "Summer to Frost",
      "Sun Requirement": "Full sun",
      "Spacing": "10-12 inches",
      "Special Feature": "Natural nematode repellent"
    },
    reviews: [
      { id: 1, author: "Sunita M.", rating: 5, date: "2024-10-05", text: "Planted these around my vegetable garden - noticeably fewer pests this season!" },
      { id: 2, author: "Vikram R.", rating: 4, date: "2024-08-20", text: "Beautiful flowers, great germination. Attracts lots of bees and butterflies." }
    ]
  },
  {
    id: 3,
    name: "Premium Wheat Seeds (10kg)",
    description: "High-yield wheat variety developed for Indian climatic conditions. Excellent disease resistance and adaptability. Each 10kg bag covers approximately 0.4 hectares.",
    shortDescription: "High Yield • Disease Resistant • 10kg Bag",
    price: 600,
    originalPrice: 720,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBuWfjWr0p5XkK1rHLLnTdxUDbYf9ayByiYPyjBZSVjMOrBETL5wVjPWTeraHHQq3KI7QOLZBfFAsfhcT0gPrEVSEhehtC8frutSK3EDnUjBnay621C29bEQjr8loouTvCKmhDcB2Hf3ARHy2QR2UYWq8OdX9HMF-DKN2OhTKpYVlwob-A8MH_P-2_1vk4EUTTMsGJJbUczKUMg-lUXBU87mQ4mml0IVjYZoDUKFVhRJfU6ZJcnrchh7Q",
    category: "seeds",
    tags: ["staple crop", "high yield", "disease resistant"],
    inStock: true,
    rating: 4.7,
    reviewCount: 203,
    specifications: {
      "Weight": "10 kg",
      "Coverage": "~0.4 hectares",
      "Variety": "HD-3086 (High Yield)",
      "Sowing Season": "Rabi (Oct-Dec)",
      "Yield Potential": "55-65 quintals/hectare",
      "Disease Resistance": "Rust, Blight, Smut",
      "Protein Content": "12-13%",
      "Certification": "ICAR Certified"
    },
    reviews: [
      { id: 1, author: "Harpreet S.", rating: 5, date: "2024-11-02", text: "Best wheat seeds I've used in 15 years of farming. Uniform germination, excellent tillering." },
      { id: 2, author: "Gurpreet K.", rating: 5, date: "2024-10-28", text: "Got 62 quintals per hectare this season. Highly recommended for Punjab region." }
    ]
  },
  {
    id: 4,
    name: "Organic Fertilizer Mix (5kg)",
    description: "Balanced organic fertilizer blend enriched with neem cake, vermicompost, and rock phosphate. Improves soil health naturally without chemical buildup. Safe for all crops including vegetables, fruits, and grains.",
    shortDescription: "Neem Cake + Vermicompost + Rock Phosphate • 5kg",
    price: 450,
    originalPrice: 520,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDwDvtdaTBWDNX2UfJ3-AqZRWrs0pDe1ji98caQB_eJydHiNKE1rNm_ubLD7GjzOVJoiP3f7WbYcbSdIBvlTkEnMpKQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    category: "fertilizers",
    tags: ["organic", "soil health", "neem cake"],
    inStock: true,
    rating: 4.9,
    reviewCount: 156,
    specifications: {
      "Weight": "5 kg",
      "Composition": "Neem Cake (40%), Vermicompost (35%), Rock Phosphate (25%)",
      "NPK Ratio": "4-2-3 (approx.)",
      "Application": "2-3 kg per 100 sq ft",
      "Suitable For": "All crops - vegetables, fruits, grains, flowers",
      "Certification": "NPOP Organic Certified",
      "Shelf Life": "12 months from manufacture",
      "Packaging": "Moisture-proof recyclable bag"
    },
    reviews: [
      { id: 1, author: "Meera D.", rating: 5, date: "2024-10-18", text: "Soil texture improved dramatically. My vegetable yield increased by 30% this season." },
      { id: 2, author: "Rajesh K.", rating: 5, date: "2024-09-25", text: "No chemical smell, earthy fragrance. Plants look healthier within 2 weeks of application." }
    ]
  },
  {
    id: 5,
    name: "Stainless Steel Hand Trowel",
    description: "Ergonomic stainless steel hand trowel with comfortable wooden handle. Rust-resistant, durable, and designed for precision work in tight spaces. Perfect for transplanting, weeding, and soil preparation.",
    shortDescription: "Ergonomic Wooden Handle • Rust-Resistant • Lifetime Warranty",
    price: 380,
    originalPrice: 450,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAv9l5YKQK7aiMu_5m8C6g5MafSEAiPwFXlvIG8FzAt7zyM-HtASNCtbCbPNRq7JHsBjXstZ1fzLdzXOz-UsIcXAQFHp_AaXnApVERt_mYHk5P0t8OUg08d1DCgyXWOp_BUsLQ5qFyHT9ioibx5ZQTpCloDXxm2Tv6khFIhk-FDlai6JTZ1fGojf5QPsYWVKP8NXlBaeZ3D3bS_OeWTBkW3uocwWkX8rcPDYTbPSBPI9iOgUvifemOUg",
    category: "tools",
    tags: ["hand tool", "stainless steel", "ergonomic"],
    inStock: true,
    rating: 4.8,
    reviewCount: 67,
    specifications: {
      "Material": "304 Stainless Steel Blade, Sustainable Hardwood Handle",
      "Blade Length": "6 inches",
      "Total Length": "11.5 inches",
      "Weight": "280g",
      "Handle Type": "Ergonomic D-grip",
      "Warranty": "Lifetime against manufacturing defects",
      "Care": "Wipe clean after use, oil wooden handle annually"
    },
    reviews: [
      { id: 1, author: "Kavya N.", rating: 5, date: "2024-10-10", text: "Perfect balance and weight. The wooden handle feels great even after hours of use." },
      { id: 2, author: "Amit P.", rating: 4, date: "2024-09-15", text: "High quality steel, no rust after months of use. Slightly pricey but worth it." }
    ]
  },
  {
    id: 6,
    name: "Drip Irrigation Kit (100m)",
    description: "Complete drip irrigation system for up to 100 sq meters. Includes main line, drippers, connectors, stakes, and timer. Saves up to 70% water compared to flood irrigation. Easy DIY installation.",
    shortDescription: "Water Saving 70% • 100m Coverage • Includes Timer",
    price: 2200,
    originalPrice: 2800,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDwDvtdaTBWDNX2UfJ3-AqZRWrs0pDe1ji98caQB_eJydHiNKE1rNm_ubLD7GjzOVJoiP3f7WbYcbSdIBvlTkEnMpKQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    category: "tools",
    tags: ["irrigation", "water saving", "diy kit"],
    inStock: true,
    rating: 4.5,
    reviewCount: 92,
    specifications: {
      "Coverage Area": "Up to 100 sq meters",
      "Main Pipe": "16mm LDPE, 50m",
      "Drippers": "20pcs (4 L/h pressure compensating)",
      "Connectors": "Tees, elbows, end caps, joiners",
      "Stakes": "20pcs plastic stakes",
      "Timer": "Battery-operated digital timer included",
      "Filter": "120 mesh screen filter",
      "Pressure Range": "1-3 bar",
      "Water Saving": "Up to 70% vs flood irrigation"
    },
    reviews: [
      { id: 1, author: "Suresh R.", rating: 5, date: "2024-10-22", text: "Installed in 2 hours. Water bill dropped 60%. Timer works perfectly. Great value." },
      { id: 2, author: "Lakshmi T.", rating: 4, date: "2024-09-30", text: "Good kit for small farm. Instructions clear. Need better quality stakes though." }
    ]
  }
];

export const categories = [
  { id: "all", name: "All Products", icon: "grid_view" },
  { id: "seeds", name: "Seeds", icon: "grass", count: 3 },
  { id: "fertilizers", name: "Fertilizers", icon: "eco", count: 1 },
  { id: "tools", name: "Tools & Equipment", icon: "build", count: 2 }
];

export const events = [
  {
    id: 1,
    title: "Organic Farming Workshop",
    date: "November 15, 2024",
    time: "9:00 AM - 4:00 PM",
    location: "Krishi Vigyan Kendra, Pune",
    description: "Learn sustainable organic farming techniques from experts. Hands-on training in composting, natural pest management, and soil health improvement.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlTunn-4DLorWd1o9qP4S9jIQ0BqQ87f_MzJZ2iJOk9YoGDi23oFfBvZyIvtD6VKOrO0Y5cbpXhpA6l71qyyoxfQpdrqhLwZvle4foCTrFy5L4478wmEE5FUmhmeeKyf1jwNSm5Qf9IJgkQ1IzduXhPqPDXWSo2CALP5cSxgNfH5wfTsmaotvt_nxZGiBtLP4y7zEHlTG93dGHz8qWGEY_4xEZwe13xve889LSj-UiqAZSVD97PaAhOQ",
    registered: 45,
    capacity: 60,
    type: "workshop"
  },
  {
    id: 2,
    title: "Seed Festival & Exchange",
    date: "December 8, 2024",
    time: "10:00 AM - 6:00 PM",
    location: "Agrinagar Community Ground, Maharashtra",
    description: "Annual celebration of seed diversity. Exchange heirloom varieties, attend talks by seed savers, and discover rare indigenous crops.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAAv9l5YKQK7aiMu_5m8C6g5MafSEAiPwFXlvIG8FzAt7zyM-HtASNCtbCbPNRq7JHsBjXstZ1fzLdzXOz-UsIcXAQFHp_AaXnApVERt_mYHk5P0t8OUg08d1DCgyXWOp_BUsLQicqst27Vn4i20TUIkev4sa8mcKBReXdcrPLaTEkkUQ39MJqXzzqKne9xncLG0UbVwTm7DB43pDFCBmMCGUoTYEgN_G_v87p9CCIckElkQDMHO2e7SBrRkIx_lmsm7ABnJVIZRj_bqykazAJnlejRIXMFEsWBY-i0zflOmE4VQFE",
    registered: 120,
    capacity: 200,
    type: "festival"
  }
];

export const indianStates = [
  { code: "AN", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "CH", name: "Chandigarh" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PY", name: "Puducherry" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UT", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" }
];

// Districts per state (top districts for fallback when pincode lookup fails)
export const districtsByState = {
  "AN": ["Anantapur","Chittoor","East Godavari","Guntur","Krishna","Kurnool","Nellore","Prakasam","Srikakulam","Visakhapatnam","Vizianagaram","West Godavari","YSR Kadapa"],
  "AR": ["Itanagar","Naharlagun","Pasighat","Tawang","Ziro","Bomdila","Along","Tezu"],
  "AS": ["Guwahati","Dibrugarh","Jorhat","Silchar","Tezpur","Tinsukia","Nagaon","Karimganj"],
  "BR": ["Patna","Gaya","Bhagalpur","Muzaffarpur","Purnia","Darbhanga","Begusarai","Chhapra","Sasaram","Hajipur"],
  "CG": ["Raipur","Bhilai","Bilaspur","Korba","Durg","Rajnandgaon","Jagdalpur","Raigarh"],
  "CH": ["Chandigarh"],
  "DN": ["Daman","Diu","Silvassa"],
  "DL": ["Central Delhi","East Delhi","New Delhi","North Delhi","South Delhi","West Delhi","North East Delhi","North West Delhi","Shahdara","South East Delhi","South West Delhi"],
  "GA": ["North Goa","South Goa"],
  "GJ": ["Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar","Junagadh","Gandhinagar","Anand","Navsari","Morbi","Mehsana","Bharuch","Porbandar"],
  "HR": ["Gurugram","Faridabad","Panipat","Ambala","Yamunanagar","Rohtak","Hisar","Karnal","Sonipat","Panchkula","Sirsa","Bhiwani","Rohtak"],
  "HP": ["Shimla","Manali","Dharamshala","Kullu","Solan","Mandi","Bilaspur","Una","Hamirpur","Kangra","Sirmaur","Chamba"],
  "JK": ["Srinagar","Jammu","Anantnag","Baramulla","Kathua","Udhampur","Poonch","Rajouri"],
  "JH": ["Ranchi","Jamshedpur","Dhanbad","Bokaro","Hazaribagh","Deoghar","Giridih","Dumka"],
  "KA": ["Bengaluru","Mysuru","Hubli-Dharwad","Mangaluru","Belagavi","Kalaburagi","Davanagere","Ballari","Vijayapura","Shivamogga","Tumakuru","Udupi","Hassan"],
  "KL": ["Thiruvananthapuram","Kochi","Kozhikode","Thrissur","Kollam","Alappuzha","Palakkad","Malappuram","Kannur","Kasaragod","Idukki","Wayanad"],
  "LA": ["Leh","Kargil"],
  "LD": ["Kavaratti"],
  "MP": ["Indore","Bhopal","Jabalpur","Gwalior","Ujjain","Sagar","Dewas","Satna","Ratlam","Rewa","Chhindwara","Khandwa","Vidisha"],
  "MH": ["Mumbai","Pune","Nagpur","Nashik","Aurangabad","Solapur","Amravati","Kolhapur","Sangli","Satara","Thane","Navi Mumbai","Akola","Latur","Jalgaon"],
  "MN": ["Imphal","Thoubal","Bishnupur","Churachandpur","Kakching"],
  "ML": ["Shillong","Tura","Jowai","Nongstoin","Williamnagar"],
  "MZ": ["Aizawl","Lunglei","Champhai","Serchhip","Kolasib","Mamit"],
  "NL": ["Kohima","Dimapur","Mokokchung","Tuensang","Wokha","Zunheboto","Mon"],
  "OD": ["Bhubaneswar","Cuttack","Puri","Rourkela","Brahmapur","Sambalpur","Balasore","Baripada","Jharsuguda","Jeypore"],
  "PY": ["Puducherry","Karaikal","Mahe","Yanam"],
  "PB": ["Ludhiana","Amritsar","Jalandhar","Patiala","Bathinda","Mohali","Firozpur","Batala","Pathankot","Moga","Hoshiarpur","Sangrur"],
  "RJ": ["Jaipur","Jodhpur","Kota","Bikaner","Udaipur","Ajmer","Bhilwara","Alwar","Bharatpur","Sikar","Tonk","Pali","Sri Ganganagar"],
  "SK": ["Gangtok","Namchi","Gyalshing","Mangan","Rangpo","Singtam"],
  "TN": ["Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli","Tiruppur","Vellore","Erode","Thoothukudi","Dindigul","Kanchipuram","Tanjore"],
  "TS": ["Hyderabad","Warangal","Nizamabad","Karimnagar","Khammam","Ramagundam","Mahbubnagar","Nalgonda","Adilabad"],
  "TR": ["Agartala","Udaipur","Dharmanagar","Kailashahar","Ambassa","Teliamura","Khowai","Belonia"],
  "UP": ["Lucknow","Kanpur","Varanasi","Agra","Meerut","Prayagraj","Bareilly","Aligarh","Moradabad","Saharanpur","Ghaziabad","Noida","Mathura","Gorakhpur","Jhansi"],
  "UT": ["Dehradun","Haridwar","Rishikesh","Haldwani","Roorkee","Kashipur","Rudrapur","Nainital","Mussoorie"],
  "WB": ["Kolkata","Howrah","Durgapur","Asansol","Siliguri","Malda","Bardhaman","Berhampore","Kharagpur","Haldia","Darjeeling","Jalpaiguri"]
};

// State name lookup (for pincode API which returns full names like "Maharashtra")
export const stateNameToCode = Object.fromEntries(
  indianStates.map(s => [s.name.toLowerCase(), s.code])
);
