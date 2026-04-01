const createListing = ({
    id,
    name,
    category,
    location,
    price,
    rating,
    image,
    path,
}) => ({
    id,
    name,
    category,
    location,
    price,
    rating,
    image,
    path,
})

const beauty = [
    createListing({
        id: 'glow-lab',
        name: 'Glow Lab Studio',
        category: 'Салон красоты • окрашивание',
        location: 'Brooklyn, NY',
        price: 'от $75',
        rating: '4.9',
        image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=80',
        path: '/business/glow-lab',
    }),
    createListing({
        id: 'atelier-nails',
        name: 'Atelier Nails',
        category: 'Маникюр • уход',
        location: 'Miami, FL',
        price: 'от $55',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80',
        path: '/business/atelier-nails',
    }),
    createListing({
        id: 'urban-barber',
        name: 'Urban Barber Club',
        category: 'Барбершоп • premium',
        location: 'Austin, TX',
        price: 'от $40',
        rating: '4.9',
        image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
        path: '/business/urban-barber',
    }),
]

const wellness = [
    createListing({
        id: 'pure-balance',
        name: 'Pure Balance Wellness',
        category: 'Массаж • реабилитация',
        location: 'Seattle, WA',
        price: 'от $90',
        rating: '4.9',
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80',
        path: '/business/pure-balance',
    }),
    createListing({
        id: 'flow-yoga',
        name: 'FLOW Yoga Loft',
        category: 'Йога • групповые занятия',
        location: 'Denver, CO',
        price: 'от $35',
        rating: '4.7',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
        path: '/business/flow-yoga',
    }),
    createListing({
        id: 'coastline-therapy',
        name: 'Coastline Therapy',
        category: 'Физиотерапия • домашние визиты',
        location: 'San Diego, CA',
        price: 'от $120',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1523419409543-0c1df022bddb?auto=format&fit=crop&w=900&q=80',
        path: '/business/coastline-therapy',
    }),
]

const home = [
    createListing({
        id: 'bright-hands',
        name: 'Bright Hands Cleaning',
        category: 'Клининг квартир',
        location: 'Chicago, IL',
        price: 'от $110',
        rating: '4.9',
        image: 'https://images.unsplash.com/photo-1489278353717-ebfbb99c6f85?auto=format&fit=crop&w=900&q=80',
        path: '/business/bright-hands',
    }),
    createListing({
        id: 'mr-fix-auto',
        name: 'Mr. Fix Auto Detail',
        category: 'Детейлинг • mobile',
        location: 'Phoenix, AZ',
        price: 'от $150',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
        path: '/business/mr-fix-auto',
    }),
    createListing({
        id: 'green-yard',
        name: 'Green Yard Crew',
        category: 'Сад и газоны',
        location: 'Atlanta, GA',
        price: 'от $60',
        rating: '4.6',
        image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80',
        path: '/business/green-yard',
    }),
]

const auto = [
    createListing({
        id: 'next-auto',
        name: 'Next Auto Garage',
        category: 'СТО • техобслуживание',
        location: 'Los Angeles, CA',
        price: 'от $95',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=900&q=80',
        path: '/business/next-auto',
    }),
    createListing({
        id: 'ride-share',
        name: 'Ride Share Repair',
        category: 'Сервис для такси/курьеров',
        location: 'Newark, NJ',
        price: 'от $80',
        rating: '4.7',
        image: 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=900&q=80',
        path: '/business/ride-share',
    }),
    createListing({
        id: 'volt-mobile',
        name: 'Volt Mobile Mechanics',
        category: 'Выездные механики',
        location: 'Dallas, TX',
        price: 'от $140',
        rating: '4.9',
        image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80',
        path: '/business/volt-mobile',
    }),
]

const education = [
    createListing({
        id: 'sky-tutors',
        name: 'Skyline Tutors',
        category: 'ЕГЭ • SAT подготовка',
        location: 'Boston, MA',
        price: 'от $65',
        rating: '4.9',
        image: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80',
        path: '/business/sky-tutors',
    }),
    createListing({
        id: 'music-lab',
        name: 'Music Lab Kids',
        category: 'Музыка • индивидуально',
        location: 'Portland, OR',
        price: 'от $55',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
        path: '/business/music-lab',
    }),
    createListing({
        id: 'coach-fit',
        name: 'Coach & Fit Studio',
        category: 'Персональный тренер',
        location: 'Houston, TX',
        price: 'от $70',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
        path: '/business/coach-fit',
    }),
]

const events = [
    createListing({
        id: 'city-events',
        name: 'City Events Lab',
        category: 'Организация мероприятий',
        location: 'San Francisco, CA',
        price: 'от $500',
        rating: '4.9',
        image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
        path: '/business/city-events',
    }),
    createListing({
        id: 'studio-photo',
        name: 'Studio North Photo',
        category: 'Фотостудия • бренды',
        location: 'New York, NY',
        price: 'от $350',
        rating: '4.8',
        image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80',
        path: '/business/studio-photo',
    }),
    createListing({
        id: 'sound-wave',
        name: 'SoundWave DJs',
        category: 'Музыкальное сопровождение',
        location: 'Las Vegas, NV',
        price: 'от $420',
        rating: '4.7',
        image: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80',
        path: '/business/sound-wave',
    }),
]

export const allServices = [
    ...beauty,
    ...wellness,
    ...home,
    ...auto,
    ...education,
    ...events,
]

export const beautyServices = beauty
export const wellnessServices = wellness
export const homeServices = home
export const autoServices = auto
export const educationServices = education
export const eventServices = events
