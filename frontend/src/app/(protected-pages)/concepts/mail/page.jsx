import MailEditor from './_components/MailEditor'
import MailProvider from './_components/MailProvider'
import MailBody from './_components/MailBody'
import getMail from '@/server/actions/getMail'
import getMailList from '@/server/actions/getMailList'

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }) {
    const params = await searchParams

    const mail = await getMail(params)
    const mailList = await getMailList(params)

    return (
        <MailProvider mailList={mailList}>
            <MailBody mail={mail} />
            <MailEditor />
        </MailProvider>
    )
}
