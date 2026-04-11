<?php

namespace Database\Seeders\DemoRextenPro;

/**
 * Публичные POI в Greater LA + координаты офиса/депо; вымышленные телефоны +1-555.
 * Не использовать реальные частные адреса.
 */
final class DemoRextenProDataset
{
    public const DEMO_BOOKING_MARKER = '[demo-seed]';

    public const OWNER_EMAIL_DEFAULT = 'demo@rexten.pro';

    /** Отдельный демо-аккаунт бьюти (салон, маникюр / брови / парикмахер). */
    public const OWNER_EMAIL_BEAUTY_DEFAULT = 'demo-beauty@rexten.pro';

    /** Демо HVAC: отопление / кондиционирование, выездные бригады. */
    public const OWNER_EMAIL_HVAC_DEFAULT = 'demo-hvac@rexten.pro';

    public const TIMEZONE = 'America/Los_Angeles';

    /** База салона / компании (West LA, публичная коммерческая зона). */
    public const SALON_ADDRESS = '10250 Santa Monica Blvd, Los Angeles, CA 90067, USA';

    public const SALON_CITY = 'Los Angeles';

    public const SALON_STATE = 'CA';

    public const SALON_ZIP = '90067';

    public const SALON_LAT = 34.05870;

    public const SALON_LNG = -118.41940;

    /** Депо выездной бригады 1 (San Fernando Valley). */
    public const CLEANER_DEPOT_1_ADDRESS = '3400 Cahuenga Blvd W, Los Angeles, CA 90068, USA';

    public const CLEANER_DEPOT_1_LAT = 34.13520;

    public const CLEANER_DEPOT_1_LNG = -118.36000;

    /** Депо выездной бригады 2 (South Bay). */
    public const CLEANER_DEPOT_2_ADDRESS = '550 Deep Valley Dr, Rolling Hills Estates, CA 90274, USA';

    public const CLEANER_DEPOT_2_LAT = 33.78750;

    public const CLEANER_DEPOT_2_LNG = -118.37080;

    /**
     * Публичные места для offsite-клининга (адрес + lat + lng).
     *
     * @return list<array{label:string,address:string,lat:float,lng:float,city:string,state:string,zip:string}>
     */
    public static function laVisitPoints(): array
    {
        return [
            ['label' => 'The Grove', 'address' => '189 The Grove Dr, Los Angeles, CA 90036', 'lat' => 34.07220, 'lng' => -118.35770, 'city' => 'Los Angeles', 'state' => 'CA', 'zip' => '90036'],
            ['label' => 'LA Central Library', 'address' => '630 W 5th St, Los Angeles, CA 90071', 'lat' => 34.05050, 'lng' => -118.25500, 'city' => 'Los Angeles', 'state' => 'CA', 'zip' => '90071'],
            ['label' => 'Santa Monica Public Library', 'address' => '601 Santa Monica Blvd, Santa Monica, CA 90401', 'lat' => 34.02190, 'lng' => -118.49360, 'city' => 'Santa Monica', 'state' => 'CA', 'zip' => '90401'],
            ['label' => 'Westfield Century City', 'address' => '10250 Santa Monica Blvd, Los Angeles, CA 90067', 'lat' => 34.05870, 'lng' => -118.41940, 'city' => 'Los Angeles', 'state' => 'CA', 'zip' => '90067'],
            ['label' => 'Griffith Observatory', 'address' => '2800 E Observatory Rd, Los Angeles, CA 90027', 'lat' => 34.11840, 'lng' => -118.30040, 'city' => 'Los Angeles', 'state' => 'CA', 'zip' => '90027'],
            ['label' => 'Getty Center', 'address' => '1200 Getty Center Dr, Los Angeles, CA 90049', 'lat' => 34.07810, 'lng' => -118.47410, 'city' => 'Los Angeles', 'state' => 'CA', 'zip' => '90049'],
            ['label' => 'Natural History Museum', 'address' => '900 Exposition Blvd, Los Angeles, CA 90007', 'lat' => 34.01710, 'lng' => -118.28870, 'city' => 'Los Angeles', 'state' => 'CA', 'zip' => '90007'],
            ['label' => 'The Broad', 'address' => '221 S Grand Ave, Los Angeles, CA 90012', 'lat' => 34.05450, 'lng' => -118.25000, 'city' => 'Los Angeles', 'state' => 'CA', 'zip' => '90012'],
            ['label' => 'Union Station LA', 'address' => '800 N Alameda St, Los Angeles, CA 90012', 'lat' => 34.05620, 'lng' => -118.23480, 'city' => 'Los Angeles', 'state' => 'CA', 'zip' => '90012'],
            ['label' => 'Pasadena Central Library', 'address' => '285 E Walnut St, Pasadena, CA 91101', 'lat' => 34.14780, 'lng' => -118.14420, 'city' => 'Pasadena', 'state' => 'CA', 'zip' => '91101'],
            ['label' => 'Glendale Central Library', 'address' => '222 E Harvard St, Glendale, CA 91205', 'lat' => 34.14290, 'lng' => -118.25480, 'city' => 'Glendale', 'state' => 'CA', 'zip' => '91205'],
            ['label' => 'Westfield Topanga', 'address' => '6600 Topanga Canyon Blvd, Canoga Park, CA 91303', 'lat' => 34.19040, 'lng' => -118.60280, 'city' => 'Canoga Park', 'state' => 'CA', 'zip' => '91303'],
            ['label' => 'Del Amo Fashion Center', 'address' => '3525 W Carson St, Torrance, CA 90503', 'lat' => 33.83100, 'lng' => -118.34930, 'city' => 'Torrance', 'state' => 'CA', 'zip' => '90503'],
            ['label' => 'Long Beach Public Library', 'address' => '200 W Broadway, Long Beach, CA 90802', 'lat' => 33.76900, 'lng' => -118.19240, 'city' => 'Long Beach', 'state' => 'CA', 'zip' => '90802'],
            ['label' => 'Irvine Spectrum Center', 'address' => '670 Spectrum Center Dr, Irvine, CA 92618', 'lat' => 33.65050, 'lng' => -117.74300, 'city' => 'Irvine', 'state' => 'CA', 'zip' => '92618'],
            ['label' => 'Anaheim Convention Center', 'address' => '800 W Katella Ave, Anaheim, CA 92802', 'lat' => 33.80250, 'lng' => -117.92080, 'city' => 'Anaheim', 'state' => 'CA', 'zip' => '92802'],
            ['label' => 'Burbank Central Library', 'address' => '110 N Glenoaks Blvd, Burbank, CA 91502', 'lat' => 34.18120, 'lng' => -118.30800, 'city' => 'Burbank', 'state' => 'CA', 'zip' => '91502'],
            ['label' => 'Culver City Julian Dixon Library', 'address' => '4975 Overland Ave, Culver City, CA 90230', 'lat' => 34.02100, 'lng' => -118.39600, 'city' => 'Culver City', 'state' => 'CA', 'zip' => '90230'],
            ['label' => 'Westfield Culver City', 'address' => '6000 Sepulveda Blvd, Culver City, CA 90230', 'lat' => 33.98700, 'lng' => -118.39600, 'city' => 'Culver City', 'state' => 'CA', 'zip' => '90230'],
            ['label' => 'Koreatown Pavilion', 'address' => '3250 Wilshire Blvd, Los Angeles, CA 90010', 'lat' => 34.06180, 'lng' => -118.29100, 'city' => 'Los Angeles', 'state' => 'CA', 'zip' => '90010'],
        ];
    }

    public static function fakePhoneUs(int $index): string
    {
        $a = 200 + ($index % 700);
        $b = ($index * 97 + 13) % 10000;

        return sprintf('+1 (555) %03d-%04d', $a, $b);
    }

    public static function clientEmail(int $index): string
    {
        return sprintf('rexten_demo_c_%04d@clients.rexten.demo', $index);
    }

    public static function teamEmail(string $role, int $n): string
    {
        return sprintf('demo.team.%s%d@demo.rexten.internal', $role, $n);
    }

    /** Email участника команды бьюти-демо (уникально от клининга). */
    public static function beautyTeamEmail(string $role, int $n): string
    {
        return sprintf('demo.team.beauty.%s%d@demo.rexten.internal', $role, $n);
    }

    /** Клиенты только для бьюти-демо (отдельный пул от rexten_demo_c_*). */
    public static function beautyClientEmail(int $index): string
    {
        return sprintf('rexten_demo_b_%04d@clients.rexten.demo', $index);
    }

    public static function hvacTeamEmail(string $role, int $n): string
    {
        return sprintf('demo.team.hvac.%s%d@demo.rexten.internal', $role, $n);
    }

    /** Клиенты только для HVAC-демо. */
    public static function hvacClientEmail(int $index): string
    {
        return sprintf('rexten_demo_h_%04d@clients.rexten.demo', $index);
    }

    /**
     * Элементы портфолио для объявления type=regular (поле advertisements.portfolio).
     * API настроек читает портфолио с первого regular-объявления компании.
     *
     * @return list<array{id:int,title:string,category:string,image:string}>
     */
    public static function advertisementPortfolioCleaning(): array
    {
        return [
            [
                'id' => 1,
                'title' => 'Deep clean — Pacific Palisades',
                'category' => 'Residential',
                'image' => 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
            ],
            [
                'id' => 2,
                'title' => 'Post-renovation detail',
                'category' => 'Deep clean',
                'image' => 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
            ],
            [
                'id' => 3,
                'title' => 'Weekly maintenance',
                'category' => 'Maintenance',
                'image' => 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80',
            ],
        ];
    }

    /** @return list<array{id:int,title:string,category:string,image:string}> */
    public static function advertisementPortfolioBeauty(): array
    {
        return [
            [
                'id' => 1,
                'title' => 'Gel manicure — studio set',
                'category' => 'Nails',
                'image' => 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80',
            ],
            [
                'id' => 2,
                'title' => 'Brow design session',
                'category' => 'Brows',
                'image' => 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80',
            ],
            [
                'id' => 3,
                'title' => 'Cut & blowout',
                'category' => 'Hair',
                'image' => 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
            ],
        ];
    }

    /** @return list<array{id:int,title:string,category:string,image:string}> */
    public static function advertisementPortfolioHvac(): array
    {
        return [
            [
                'id' => 1,
                'title' => 'AC tune-up — Santa Monica',
                'category' => 'Cooling',
                'image' => 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80',
            ],
            [
                'id' => 2,
                'title' => 'Furnace safety inspection',
                'category' => 'Heating',
                'image' => 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1200&q=80',
            ],
            [
                'id' => 3,
                'title' => 'Duct cleaning project',
                'category' => 'Air quality',
                'image' => 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
            ],
        ];
    }
}
