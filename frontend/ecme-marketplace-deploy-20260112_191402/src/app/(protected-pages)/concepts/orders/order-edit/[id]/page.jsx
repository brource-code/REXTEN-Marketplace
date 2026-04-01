import OrderEdit from './_components/OrderEdit'
import NotFound from '@/components/shared/NotFound'
import getOrderDetails from '@/server/actions/getOrderDetails'
import isEmpty from 'lodash/isEmpty'

export default async function Page(props) {
    const params = await props.params

    const data = await getOrderDetails(params)

    if (isEmpty(data)) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <NotFound message="No order found!" />
            </div>
        )
    }

    return <OrderEdit data={data} />
}
