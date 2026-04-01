<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Advertisement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LocationController extends Controller
{
    /**
     * Статические данные штатов США (fallback)
     */
    private function getStaticStates()
    {
        return [
            ['id' => 'AL', 'name' => 'Alabama'],
            ['id' => 'AK', 'name' => 'Alaska'],
            ['id' => 'AZ', 'name' => 'Arizona'],
            ['id' => 'AR', 'name' => 'Arkansas'],
            ['id' => 'CA', 'name' => 'California'],
            ['id' => 'CO', 'name' => 'Colorado'],
            ['id' => 'CT', 'name' => 'Connecticut'],
            ['id' => 'DE', 'name' => 'Delaware'],
            ['id' => 'FL', 'name' => 'Florida'],
            ['id' => 'GA', 'name' => 'Georgia'],
            ['id' => 'HI', 'name' => 'Hawaii'],
            ['id' => 'ID', 'name' => 'Idaho'],
            ['id' => 'IL', 'name' => 'Illinois'],
            ['id' => 'IN', 'name' => 'Indiana'],
            ['id' => 'IA', 'name' => 'Iowa'],
            ['id' => 'KS', 'name' => 'Kansas'],
            ['id' => 'KY', 'name' => 'Kentucky'],
            ['id' => 'LA', 'name' => 'Louisiana'],
            ['id' => 'ME', 'name' => 'Maine'],
            ['id' => 'MD', 'name' => 'Maryland'],
            ['id' => 'MA', 'name' => 'Massachusetts'],
            ['id' => 'MI', 'name' => 'Michigan'],
            ['id' => 'MN', 'name' => 'Minnesota'],
            ['id' => 'MS', 'name' => 'Mississippi'],
            ['id' => 'MO', 'name' => 'Missouri'],
            ['id' => 'MT', 'name' => 'Montana'],
            ['id' => 'NE', 'name' => 'Nebraska'],
            ['id' => 'NV', 'name' => 'Nevada'],
            ['id' => 'NH', 'name' => 'New Hampshire'],
            ['id' => 'NJ', 'name' => 'New Jersey'],
            ['id' => 'NM', 'name' => 'New Mexico'],
            ['id' => 'NY', 'name' => 'New York'],
            ['id' => 'NC', 'name' => 'North Carolina'],
            ['id' => 'ND', 'name' => 'North Dakota'],
            ['id' => 'OH', 'name' => 'Ohio'],
            ['id' => 'OK', 'name' => 'Oklahoma'],
            ['id' => 'OR', 'name' => 'Oregon'],
            ['id' => 'PA', 'name' => 'Pennsylvania'],
            ['id' => 'RI', 'name' => 'Rhode Island'],
            ['id' => 'SC', 'name' => 'South Carolina'],
            ['id' => 'SD', 'name' => 'South Dakota'],
            ['id' => 'TN', 'name' => 'Tennessee'],
            ['id' => 'TX', 'name' => 'Texas'],
            ['id' => 'UT', 'name' => 'Utah'],
            ['id' => 'VT', 'name' => 'Vermont'],
            ['id' => 'VA', 'name' => 'Virginia'],
            ['id' => 'WA', 'name' => 'Washington'],
            ['id' => 'WV', 'name' => 'West Virginia'],
            ['id' => 'WI', 'name' => 'Wisconsin'],
            ['id' => 'WY', 'name' => 'Wyoming'],
            ['id' => 'DC', 'name' => 'District of Columbia'],
        ];
    }

    /**
     * Статические данные городов по штатам (fallback)
     */
    private function getStaticCitiesByState($stateId)
    {
        $cities = [
            'AL' => ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville'],
            'AK' => ['Anchorage', 'Fairbanks', 'Juneau'],
            'AZ' => ['Phoenix', 'Tucson', 'Mesa', 'Scottsdale', 'Tempe', 'Chandler', 'Glendale'],
            'AR' => ['Little Rock', 'Fayetteville', 'Fort Smith'],
            'CA' => ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Stockton', 'Irvine', 'Chula Vista', 'Fremont', 'San Bernardino', 'Modesto', 'Fontana', 'Oxnard', 'Moreno Valley', 'Huntington Beach', 'Glendale', 'Santa Clarita', 'Garden Grove', 'Oceanside', 'Rancho Cucamonga', 'Santa Rosa', 'Ontario', 'Lancaster', 'Elk Grove', 'Corona', 'Palmdale', 'Salinas', 'Pomona', 'Hayward', 'Escondido', 'Torrance', 'Sunnyvale', 'Orange', 'Fullerton', 'Pasadena', 'Thousand Oaks', 'Visalia', 'Simi Valley', 'Concord', 'Roseville', 'Vallejo', 'Fairfield', 'Inglewood', 'Santa Clara', 'El Monte', 'Berkeley', 'Downey', 'Costa Mesa', 'West Covina', 'Ventura', 'Richmond', 'Antioch', 'Daly City', 'Temecula', 'Santa Maria', 'El Cajon', 'San Mateo', 'Carlsbad', 'Vista', 'Mission Viejo', 'Vacaville', 'Carson', 'Santa Monica', 'Westminster', 'Redding', 'Santa Barbara', 'Newport Beach', 'San Leandro', 'Hawthorne', 'Citrus Heights', 'Tracy', 'Alhambra', 'Livermore', 'Buena Park', 'Lakewood', 'Merced', 'Napa', 'Redwood City', 'Whittier', 'Chino', 'Indio', 'Alameda', 'Mountain View', 'Upland', 'Folsom', 'Union City', 'Palm Desert', 'Apple Valley', 'Turlock', 'Milpitas', 'Redondo Beach', 'Lodi', 'Madera', 'Pacifica', 'Encinitas', 'Montebello', 'Camarillo', 'San Rafael', 'Petaluma', 'San Bruno', 'La Mesa', 'San Marcos', 'South San Francisco', 'Yuba City', 'Pittsburg', 'Laguna Niguel', 'Davis', 'Castro Valley', 'Yorba Linda', 'Brentwood', 'Palo Alto', 'San Gabriel', 'Rocklin', 'Cerritos', 'Poway', 'Cupertino', 'Monterey Park', 'San Luis Obispo', 'Tustin', 'Pleasanton', 'Los Gatos', 'San Carlos', 'Foster City', 'Culver City', 'Morgan Hill', 'Covina', 'San Clemente', 'Norwalk', 'Beverly Hills', 'Dublin', 'Seal Beach', 'Los Altos', 'Arcadia', 'Saratoga', 'Glendora', 'Palm Springs', 'El Segundo', 'Manhattan Beach', 'Hermosa Beach', 'Lafayette', 'Burlingame', 'Danville', 'Belmont', 'Mill Valley'],
            'CO' => ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada', 'Westminster', 'Pueblo', 'Centennial', 'Boulder', 'Greeley', 'Longmont', 'Loveland', 'Grand Junction', 'Broomfield', 'Commerce City', 'Northglenn', 'Parker', 'Brighton', 'Englewood', 'Wheat Ridge', 'Littleton', 'Montrose', 'Durango'],
            'CT' => ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury', 'Norwalk', 'Danbury', 'New Britain', 'West Hartford', 'Greenwich'],
            'DE' => ['Wilmington', 'Dover', 'Newark'],
            'FL' => ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Tallahassee', 'Fort Lauderdale', 'Port St. Lucie', 'Cape Coral', 'Pembroke Pines', 'Hollywood', 'Miramar', 'Gainesville', 'Coral Springs', 'Miami Gardens', 'Clearwater', 'Palm Bay', 'West Palm Beach', 'Pompano Beach', 'Lakeland', 'Davie', 'Miami Beach', 'Sunrise', 'Plantation', 'Boca Raton', 'Deltona', 'Largo', 'Deerfield Beach', 'Boynton Beach', 'Lauderhill', 'Fort Myers', 'Kissimmee', 'Homestead', 'Tamarac', 'Delray Beach', 'Daytona Beach', 'North Miami', 'Wellington', 'Jupiter', 'Ocala', 'Port Orange', 'Margate', 'Coconut Creek', 'Sanford', 'Sarasota', 'Pensacola', 'Bradenton', 'Palm Coast', 'Coral Gables', 'Doral', 'Bonita Springs', 'Apopka', 'Naples', 'Melbourne', 'Fort Pierce', 'Port Charlotte'],
            'GA' => ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens', 'Sandy Springs', 'Roswell', 'Macon', 'Johns Creek', 'Albany', 'Warner Robins', 'Alpharetta', 'Marietta', 'Valdosta', 'Smyrna', 'Dunwoody', 'Rome', 'East Point', 'Peachtree Corners', 'Gainesville', 'Hinesville', 'Kennesaw', 'Newnan', 'Douglasville', 'Dalton', 'Statesboro', 'Carrollton', 'Griffin', 'Woodstock', 'Canton', 'McDonough', 'Lawrenceville', 'Mableton', 'Sugar Hill', 'Tucker', 'Fayetteville', 'Peachtree City', 'Stockbridge', 'Pooler', 'Cartersville', 'Thomasville', 'Brunswick'],
            'HI' => ['Honolulu', 'Hilo', 'Kailua', 'Kaneohe', 'Pearl City'],
            'ID' => ['Boise', 'Nampa', 'Meridian', 'Idaho Falls', 'Pocatello'],
            'IL' => ['Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford', 'Springfield', 'Elgin', 'Peoria', 'Champaign', 'Waukegan', 'Cicero', 'Bloomington', 'Arlington Heights', 'Evanston', 'Schaumburg', 'Bolingbrook', 'Palatine', 'Skokie', 'Des Plaines', 'Orland Park', 'Tinley Park', 'Oak Lawn', 'Berwyn', 'Mount Prospect', 'Normal', 'Wheaton', 'Hoffman Estates', 'Oak Park', 'Downers Grove', 'Elmhurst', 'Glenview', 'DeKalb', 'Lombard', 'Buffalo Grove', 'Bartlett', 'Urbana', 'Crystal Lake', 'Quincy', 'Streamwood', 'Carol Stream', 'Romeoville', 'Plainfield', 'Hanover Park', 'Carpentersville', 'Wheeling', 'Park Ridge', 'Addison', 'Calumet City', 'Northbrook', 'St. Charles', 'Belleville', 'Crest Hill', 'Lansing', 'Mokena', 'McHenry', 'Lockport', 'Zion', 'Burbank', 'Woodridge', 'Round Lake Beach', 'Glen Ellyn', 'North Chicago', 'Gurnee', 'Oswego', 'Frankfort', 'Matteson', 'Mundelein', 'Bloomingdale', 'Lake Forest', 'Batavia', 'Geneva', 'Highland Park', 'Lake Zurich', 'Libertyville', 'Niles', 'Vernon Hills', 'Wauconda', 'Wilmette', 'Winnetka', 'Barrington'],
            'IN' => ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Bloomington', 'Hammond', 'Gary', 'Muncie', 'Terre Haute', 'Kokomo', 'Anderson', 'Noblesville', 'Greenwood', 'Elkhart', 'Mishawaka', 'Lawrence', 'Jeffersonville', 'Columbus', 'Portage', 'New Albany', 'Richmond', 'Westfield', 'Valparaiso', 'Goshen', 'Michigan City', 'Marion', 'East Chicago', 'Lafayette', 'Vincennes', 'Jasper', 'Bedford', 'Seymour', 'Connersville', 'Frankfort', 'Washington', 'Greencastle', 'Crawfordsville', 'Shelbyville', 'New Castle', 'Rushville', 'Plymouth', 'Wabash', 'Peru', 'Logansport', 'Monticello', 'Rensselaer', 'Angola', 'Auburn', 'Huntington', 'Decatur', 'Bluffton', 'Columbia City', 'Warsaw', 'Kendallville', 'LaGrange', 'Ligonier', 'Bremen', 'Mooresville', 'Martinsville', 'Spencer', 'Bloomfield', 'Linton', 'Sullivan', 'Brazil', 'Clinton', 'Rockville', 'Covington', 'Attica', 'Williamsport', 'La Porte', 'Westville', 'Knox', 'Winamac'],
            'IA' => ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Waterloo', 'Council Bluffs', 'Ames', 'West Des Moines', 'Cedar Falls'],
            'KS' => ['Wichita', 'Overland Park', 'Kansas City', 'Olathe', 'Topeka', 'Lawrence', 'Shawnee', 'Manhattan', 'Lenexa', 'Salina'],
            'KY' => ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Hopkinsville', 'Richmond', 'Florence', 'Georgetown', 'Henderson'],
            'LA' => ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Kenner', 'Bossier City', 'Monroe', 'Alexandria', 'Houma'],
            'ME' => ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn', 'Biddeford', 'Sanford', 'Saco', 'Augusta', 'Westbrook'],
            'MD' => ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie', 'Annapolis', 'College Park', 'Salisbury', 'Laurel', 'Greenbelt'],
            'MA' => ['Boston', 'Worcester', 'Springfield', 'Lowell', 'Cambridge', 'New Bedford', 'Brockton', 'Quincy', 'Lynn', 'Fall River'],
            'MI' => ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Lansing', 'Ann Arbor', 'Flint', 'Dearborn', 'Livonia', 'Troy'],
            'MN' => ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'Bloomington', 'Brooklyn Park', 'Plymouth', 'St. Cloud', 'Eagan', 'Woodbury'],
            'MS' => ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi', 'Meridian', 'Tupelo', 'Greenville', 'Olive Branch', 'Horn Lake'],
            'MO' => ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', 'Lee\'s Summit', 'O\'Fallon', 'St. Joseph', 'St. Charles', 'St. Peters'],
            'MT' => ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte', 'Helena', 'Kalispell', 'Havre', 'Anaconda', 'Miles City'],
            'NE' => ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney', 'Fremont', 'Hastings', 'North Platte', 'Norfolk', 'Columbus'],
            'NV' => ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City', 'Fernley', 'Elko', 'Mesquite', 'Boulder City'],
            'NH' => ['Manchester', 'Nashua', 'Concord', 'Derry', 'Rochester', 'Dover', 'Keene', 'Portsmouth', 'Laconia', 'Hudson'],
            'NJ' => ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison', 'Woodbridge', 'Lakewood', 'Toms River', 'Hamilton', 'Trenton'],
            'NM' => ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell', 'Farmington', 'Clovis', 'Hobbs', 'Alamogordo', 'Carlsbad'],
            'NY' => ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon', 'Schenectady', 'Utica', 'White Plains', 'Hempstead', 'Troy', 'Niagara Falls', 'Binghamton', 'Freeport', 'Valley Stream', 'Long Beach', 'Rome', 'Ithaca', 'Watertown', 'Elmira', 'Jamestown', 'Poughkeepsie', 'Kingston', 'Glens Falls', 'Batavia', 'Oswego', 'Plattsburgh', 'Corning', 'Oneonta', 'Cortland', 'Auburn', 'Canandaigua', 'Geneva', 'Seneca Falls', 'Watkins Glen', 'Hornell', 'Olean', 'Dunkirk', 'Fredonia', 'Lockport', 'Tonawanda', 'North Tonawanda', 'Amherst', 'Cheektowaga', 'West Seneca', 'Hamburg', 'Orchard Park', 'Lackawanna', 'Depew', 'Lancaster', 'Kenmore', 'Lewiston', 'Williamsville', 'Wheatfield', 'Youngstown'],
            'NC' => ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary', 'Wilmington', 'High Point', 'Concord'],
            'ND' => ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Williston', 'Dickinson', 'Mandan', 'Jamestown', 'Wahpeton'],
            'OH' => ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton', 'Youngstown', 'Lorain'],
            'OK' => ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton', 'Edmond', 'Moore', 'Midwest City', 'Enid', 'Stillwater'],
            'OR' => ['Portland', 'Eugene', 'Salem', 'Gresham', 'Hillsboro', 'Bend', 'Beaverton', 'Medford', 'Springfield', 'Corvallis'],
            'PA' => ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton', 'Bethlehem', 'Lancaster', 'Harrisburg', 'Altoona'],
            'RI' => ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence', 'Woonsocket', 'Newport', 'Central Falls', 'Westerly', 'Cumberland'],
            'SC' => ['Charleston', 'Columbia', 'North Charleston', 'Mount Pleasant', 'Rock Hill', 'Greenville', 'Summerville', 'Sumter', 'Hilton Head Island', 'Florence'],
            'SD' => ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Mitchell', 'Yankton', 'Pierre', 'Huron', 'Vermillion'],
            'TN' => ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro', 'Franklin', 'Jackson', 'Johnson City', 'Bartlett'],
            'TX' => ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Laredo', 'Lubbock', 'Garland', 'Irving', 'Amarillo', 'Grand Prairie', 'Brownsville', 'McKinney', 'Frisco', 'Pasadena', 'Killeen', 'Mesquite', 'McAllen', 'Carrollton', 'Midland', 'Denton', 'Abilene', 'Beaumont', 'Round Rock', 'Odessa', 'Waco', 'Richardson', 'Lewisville', 'Tyler', 'Pearlland', 'College Station', 'Wichita Falls', 'Edinburg', 'San Angelo', 'Allen', 'League City', 'Sugar Land', 'Longview', 'Missouri City', 'Bryan', 'Baytown', 'Pharr', 'Temple', 'Flower Mound', 'New Braunfels', 'Conroe', 'Victoria', 'Harlingen', 'Cedar Park', 'Georgetown', 'Mansfield', 'Rowlett', 'Port Arthur', 'Euless', 'DeSoto', 'Grapevine', 'Bedford', 'Galveston', 'Haltom City', 'Keller', 'Burleson', 'Texarkana', 'Friendswood', 'Coppell', 'Huntsville', 'Wylie', 'Sherman', 'Nacogdoches', 'Paris', 'Jacksonville', 'Pampa', 'Borger', 'Dumas', 'Hereford', 'Plainview', 'Big Spring', 'Sweetwater', 'Snyder', 'Brownwood', 'Stephenville', 'Graham', 'Mineral Wells', 'Weatherford', 'Cleburne', 'Glen Rose', 'Gatesville', 'Copperas Cove', 'Belton', 'San Marcos', 'Seguin', 'Lockhart', 'Bastrop', 'Elgin', 'Manor', 'Pflugerville', 'Leander', 'Lakeway', 'Bee Cave'],
            'UT' => ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Sandy', 'Ogden', 'St. George', 'Layton', 'Taylorsville'],
            'VT' => ['Burlington', 'Essex', 'South Burlington', 'Colchester', 'Rutland', 'Montpelier', 'Barre', 'St. Albans', 'Brattleboro', 'Milton'],
            'VA' => ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria', 'Hampton', 'Portsmouth', 'Suffolk', 'Roanoke'],
            'WA' => ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton', 'Yakima', 'Federal Way'],
            'WV' => ['Charleston', 'Huntington', 'Parkersburg', 'Morgantown', 'Wheeling', 'Martinsburg', 'Fairmont', 'Beckley', 'Clarksburg', 'South Charleston'],
            'WI' => ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha', 'Oshkosh', 'Eau Claire', 'Janesville'],
            'WY' => ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs', 'Sheridan', 'Green River', 'Evanston', 'Riverton', 'Jackson'],
            'DC' => ['Washington'],
        ];

        return $cities[$stateId] ?? [];
    }

    /**
     * Get all states (public endpoint)
     * GET /api/locations/states
     */
    public function getStates(Request $request)
    {
        $activeOnly = $request->boolean('active_only', false);
        $cacheKey = 'locations:states:' . ($activeOnly ? 'active' : 'all');

        return Cache::remember($cacheKey, 3600, function () use ($activeOnly) {
            $staticStates = $this->getStaticStates();
            
            if ($activeOnly) {
                try {
                    // Получаем штаты из компаний
                    $companyStates = Company::select('state')
                        ->whereNotNull('state')
                        ->where('state', '!=', '')
                        ->where('status', 'active')
                        ->where('is_visible_on_marketplace', true)
                        ->distinct()
                        ->pluck('state')
                        ->toArray();
                    
                    // Получаем штаты из объявлений
                    $adStates = Advertisement::select('state')
                        ->where('type', 'regular')
                        ->where('is_active', true)
                        ->where('status', 'approved')
                        ->whereNotNull('state')
                        ->where('state', '!=', '')
                        ->distinct()
                        ->pluck('state')
                        ->toArray();
                    
                    // Объединяем и фильтруем статические данные
                    $activeStates = array_unique(array_merge($companyStates, $adStates));
                    $staticStates = array_filter($staticStates, function ($state) use ($activeStates) {
                        return in_array($state['id'], $activeStates) || in_array($state['name'], $activeStates);
                    });
                } catch (\Exception $e) {
                    // Если БД недоступна, используем статические данные
                }
            }

            return response()->json([
                'success' => true,
                'data' => array_values($staticStates),
                'meta' => [
                    'total' => count($staticStates),
                    'cached' => true,
                ],
            ]);
        });
    }

    /**
     * Get cities by state (public endpoint)
     * GET /api/locations/cities?state=CA
     */
    public function getCities(Request $request)
    {
        $stateId = $request->get('state');
        $search = $request->get('search', '');
        $limit = (int) $request->get('limit', 100);
        $activeOnly = $request->boolean('active_only', false);

        if (!$stateId) {
            return response()->json([
                'success' => false,
                'message' => 'State parameter is required',
            ], 400);
        }

        $cacheKey = "locations:cities:{$stateId}:" . ($activeOnly ? 'active' : 'all');

        $cities = Cache::remember($cacheKey, 3600, function () use ($stateId, $activeOnly) {
            // Начинаем со статических данных
            $staticCities = $this->getStaticCitiesByState($stateId);
            
            if ($activeOnly) {
                try {
                    // Получаем города из компаний для этого штата
                    $companyCities = Company::select('city')
                        ->where('state', $stateId)
                        ->whereNotNull('city')
                        ->where('city', '!=', '')
                        ->where('status', 'active')
                        ->where('is_visible_on_marketplace', true)
                        ->distinct()
                        ->pluck('city')
                        ->toArray();
                    
                    // Получаем города из объявлений
                    $adCities = Advertisement::select('city')
                        ->where('state', $stateId)
                        ->where('type', 'regular')
                        ->where('is_active', true)
                        ->where('status', 'approved')
                        ->whereNotNull('city')
                        ->where('city', '!=', '')
                        ->distinct()
                        ->pluck('city')
                        ->toArray();
                    
                    // Объединяем и убираем дубликаты
                    $activeCities = array_unique(array_merge($companyCities, $adCities));
                    
                    // Добавляем активные города, которых нет в статических данных
                    foreach ($activeCities as $city) {
                        if (!in_array($city, $staticCities)) {
                            $staticCities[] = $city;
                        }
                    }
                    
                    // Сортируем
                    sort($staticCities);
                } catch (\Exception $e) {
                    // Если БД недоступна, используем только статические данные
                }
            }

            return $staticCities;
        });

        // Применяем поиск
        if ($search) {
            $cities = array_filter($cities, function ($city) use ($search) {
                return stripos($city, $search) !== false;
            });
        }

        // Применяем лимит
        if ($limit > 0) {
            $cities = array_slice($cities, 0, $limit);
        }

        // Форматируем ответ
        $formattedCities = array_map(function ($city) use ($stateId) {
            return [
                'id' => strtolower(str_replace(' ', '-', $city)),
                'name' => $city,
                'stateId' => $stateId,
            ];
        }, $cities);

        return response()->json([
            'success' => true,
            'data' => array_values($formattedCities),
            'meta' => [
                'state' => $stateId,
                'total' => count($formattedCities),
                'cached' => true,
            ],
        ]);
    }

    /**
     * Search locations (public endpoint)
     * GET /api/locations/search?q=Los Angeles
     */
    public function search(Request $request)
    {
        $query = $request->get('q');
        $type = $request->get('type', 'all'); // state, city, all
        $limit = (int) $request->get('limit', 20);

        if (!$query || strlen($query) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'Query parameter must be at least 2 characters',
            ], 400);
        }

        $results = [
            'states' => [],
            'cities' => [],
        ];

        if ($type === 'all' || $type === 'state') {
            $states = $this->getStaticStates();
            $matchedStates = array_filter($states, function ($state) use ($query) {
                return stripos($state['name'], $query) !== false || 
                       stripos($state['id'], $query) !== false;
            });
            $results['states'] = array_slice(array_values($matchedStates), 0, $limit);
        }

        if ($type === 'all' || $type === 'city') {
            $allStates = $this->getStaticStates();
            $matchedCities = [];
            foreach ($allStates as $state) {
                $cities = $this->getStaticCitiesByState($state['id']);
                foreach ($cities as $city) {
                    if (stripos($city, $query) !== false) {
                        $matchedCities[] = [
                            'id' => strtolower(str_replace(' ', '-', $city)),
                            'name' => $city,
                            'stateId' => $state['id'],
                            'stateName' => $state['name'],
                        ];
                        if (count($matchedCities) >= $limit) {
                            break 2;
                        }
                    }
                }
            }
            $results['cities'] = $matchedCities;
        }

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }

    /**
     * Validate location (public endpoint)
     * GET /api/locations/validate?state=CA&city=Los Angeles
     */
    public function validateLocation(Request $request)
    {
        $stateId = $request->get('state');
        $cityName = $request->get('city');

        if (!$stateId) {
            return response()->json([
                'success' => false,
                'valid' => false,
                'message' => 'State parameter is required',
            ], 400);
        }

        $states = $this->getStaticStates();
        $state = null;
        foreach ($states as $s) {
            if ($s['id'] === $stateId || $s['name'] === $stateId) {
                $state = $s;
                break;
            }
        }

        if (!$state) {
            return response()->json([
                'success' => true,
                'valid' => false,
                'data' => null,
            ]);
        }

        $city = null;
        if ($cityName) {
            $cities = $this->getStaticCitiesByState($state['id']);
            foreach ($cities as $c) {
                if (strcasecmp($c, $cityName) === 0) {
                    $city = [
                        'id' => strtolower(str_replace(' ', '-', $c)),
                        'name' => $c,
                    ];
                    break;
                }
            }
        }

        return response()->json([
            'success' => true,
            'valid' => true,
            'data' => [
                'state' => [
                    'id' => $state['id'],
                    'name' => $state['name'],
                ],
                'city' => $city,
            ],
        ]);
    }
}

