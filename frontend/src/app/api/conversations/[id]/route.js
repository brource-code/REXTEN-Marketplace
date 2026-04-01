import { NextResponse } from 'next/server'
import { conversationList } from '@/mock/data/chatData'

export async function GET(_, { params }) {
    const id = (await params).id

    try {
        const conversation = conversationList.find(
            (conversation) => conversation.id === id,
        )

        return NextResponse.json(conversation)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}
