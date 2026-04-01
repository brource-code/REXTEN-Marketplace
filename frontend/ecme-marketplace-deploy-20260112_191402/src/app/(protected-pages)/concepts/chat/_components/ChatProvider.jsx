'use client'
import { useEffect } from 'react'
import { useChatStore } from '../_store/chatStore'

const ChatProvider = ({ children, chats }) => {
    const setChats = useChatStore((state) => state.setChats)
    const setChatsFetched = useChatStore((state) => state.setChatsFetched)

    useEffect(() => {
        setChats(chats)
        setChatsFetched(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chats])

    return <>{children}</>
}

export default ChatProvider
