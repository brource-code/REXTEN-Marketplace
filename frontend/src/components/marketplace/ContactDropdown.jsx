'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Dropdown from '@/components/ui/Dropdown'
import Button from '@/components/ui/Button'
import {
    PiEnvelope,
    PiPaperPlaneTilt,
    PiMessengerLogo,
    PiChatCircle,
} from 'react-icons/pi'

const ContactDropdown = ({ email, telegram, whatsapp, phone, className, isMobile = false }) => {
    const t = useTranslations('public.company')
    
    // Формируем список доступных контактов
    const contacts = useMemo(() => {
        const items = []
        
        if (email && email.trim()) {
            items.push({
                type: 'email',
                label: 'Email',
                icon: PiEnvelope,
                href: `mailto:${email.trim()}`,
            })
        }
        
        if (telegram && telegram.trim()) {
            // Убираем @ если есть, добавляем в URL
            const telegramUsername = telegram.trim().replace(/^@/, '')
            if (telegramUsername) {
                items.push({
                    type: 'telegram',
                    label: 'Telegram',
                    icon: PiPaperPlaneTilt,
                    href: `https://t.me/${telegramUsername}`,
                })
            }
        }
        
        if (whatsapp && whatsapp.trim()) {
            // Убираем все нецифровые символы для WhatsApp
            const whatsappNumber = whatsapp.trim().replace(/\D/g, '')
            if (whatsappNumber) {
                items.push({
                    type: 'whatsapp',
                    label: 'WhatsApp',
                    icon: PiMessengerLogo,
                    href: `https://wa.me/${whatsappNumber}`,
                })
            }
        }
        
        if (phone && phone.trim()) {
            // Убираем все нецифровые символы для SMS
            const phoneNumber = phone.trim().replace(/\D/g, '')
            if (phoneNumber) {
                items.push({
                    type: 'sms',
                    label: 'SMS',
                    icon: PiChatCircle,
                    href: `sms:${phoneNumber}`,
                })
            }
        }
        
        return items
    }, [email, telegram, whatsapp, phone])

    // Если нет доступных контактов, не показываем dropdown
    if (contacts.length === 0) {
        // Fallback: если есть email, показываем кнопку email
        if (email && email.trim()) {
            return (
                <Button
                    asElement="a"
                    href={`mailto:${email.trim()}`}
                    variant="outline"
                    size="md"
                    className={`inline-flex items-center gap-2 ${className || ''}`}
                >
                    <PiEnvelope className="text-lg" />
                    {t('writeButton')}
                </Button>
            )
        }
        return null
    }

    // На мобильных показываем компактный dropdown или горизонтальную прокрутку
    if (isMobile) {
        // Если контактов 1-2, показываем горизонтально
        if (contacts.length <= 2) {
            return (
                <div className="flex gap-2 w-full">
                    {contacts.map((contact) => {
                        const Icon = contact.icon
                        return (
                            <Button
                                key={contact.type}
                                asElement="a"
                                href={contact.href}
                                variant="outline"
                                size="md"
                                className={`flex-1 inline-flex items-center justify-center gap-2 ${className || ''}`}
                            >
                                <Icon className="text-lg" />
                                <span className="hidden xs:inline">{contact.label}</span>
                            </Button>
                        )
                    })}
                </div>
            )
        }
        
        // Если контактов больше 2, показываем компактный dropdown
        return (
            <Dropdown
                placement="top-end"
                toggleClassName="w-full"
                renderTitle={
                    <Button
                        variant="outline"
                        size="md"
                        className={`w-full inline-flex items-center justify-center gap-2 ${className || ''}`}
                    >
                        <PiEnvelope className="text-lg" />
                        <span>{t('writeButton')}</span>
                    </Button>
                }
            >
                {contacts.map((contact) => {
                    const Icon = contact.icon
                    return (
                        <Dropdown.Item
                            key={contact.type}
                            asElement="a"
                            href={contact.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                        >
                            <Icon className="text-lg" />
                            <span>{contact.label}</span>
                        </Dropdown.Item>
                    )
                })}
            </Dropdown>
        )
    }

    // Если только один контакт, показываем обычную кнопку
    if (contacts.length === 1) {
        const contact = contacts[0]
        const Icon = contact.icon
        return (
            <Button
                asElement="a"
                href={contact.href}
                variant="outline"
                size="md"
                className={`inline-flex items-center gap-2 ${className || ''}`}
            >
                <Icon className="text-lg" />
                {t('writeButton')}
            </Button>
        )
    }

    // Если несколько контактов, показываем dropdown
    return (
        <Dropdown
            placement="bottom-end"
            toggleClassName="inline-flex cursor-pointer"
            renderTitle={
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <PiEnvelope className="text-lg" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('writeButton')}</span>
                </div>
            }
        >
            {contacts.map((contact) => {
                const Icon = contact.icon
                return (
                    <Dropdown.Item
                        key={contact.type}
                        asElement="a"
                        href={contact.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                    >
                        <Icon className="text-lg" />
                        <span>{contact.label}</span>
                    </Dropdown.Item>
                )
            })}
        </Dropdown>
    )
}

export default ContactDropdown
