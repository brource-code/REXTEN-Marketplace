import { ADMIN, USER } from '@/constants/roles.constant'

const clientRoute = {
    '/client/profile': {
        key: 'client.profile',
        authority: [ADMIN, USER],
    },
    '/client/orders': {
        key: 'client.orders',
        authority: [ADMIN, USER],
    },
    '/client/booking': {
        key: 'client.booking',
        authority: [ADMIN, USER],
    },
}

export default clientRoute

