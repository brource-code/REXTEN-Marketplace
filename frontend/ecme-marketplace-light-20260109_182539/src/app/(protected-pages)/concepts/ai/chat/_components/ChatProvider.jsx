'use client'
import { useEffect } from 'react'
import { usGenerativeChatStore } from '../_store/generativeChatStore'

const ChatProvider = ({ children, chatHistory }) => {
    const setChatHistory = usGenerativeChatStore(
        (state) => state.setChatHistory,
    )

    useEffect(() => {
        setChatHistory(chatHistory)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatHistory])

    return <>{children} </>
}

export default ChatProvider
