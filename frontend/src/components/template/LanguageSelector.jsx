'use client'
import { useMemo } from 'react'
import Avatar from '@/components/ui/Avatar'
import Dropdown from '@/components/ui/Dropdown'
import classNames from 'classnames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { HiCheck } from 'react-icons/hi'
import { setLocale } from '@/server/actions/locale'
import { useLocale } from 'next-intl'
import { updateUserLocale } from '@/lib/api/client'
import { UI_LANGUAGE_OPTIONS } from '@/constants/languageOptions'

const languageList = UI_LANGUAGE_OPTIONS

const _LanguageSelector = ({ className }) => {
    const locale = useLocale()

    const selectLangFlag = useMemo(() => {
        return languageList.find((lang) => lang.value === locale)?.flag
    }, [locale])

    const handleUpdateLocale = async (newLocale) => {
        // Сохраняем в cookie для фронтенда
        await setLocale(newLocale)
        
        // Пытаемся сохранить в профиль (если авторизован - сохранится, нет - игнорируем ошибку)
        try {
            await updateUserLocale(newLocale)
        } catch (error) {
            // Игнорируем ошибки авторизации (401/403) - пользователь не авторизован
        }
    }

    const selectedLanguage = (
        <div className={classNames(className, 'flex items-center')}>
            <Avatar
                size={24}
                shape="circle"
                src={`/img/countries/${selectLangFlag}.png`}
            />
        </div>
    )

    return (
        <Dropdown renderTitle={selectedLanguage} placement="bottom-end">
            {languageList.map((lang) => (
                <Dropdown.Item
                    key={lang.label}
                    className="justify-between"
                    eventKey={lang.label}
                    onClick={() => handleUpdateLocale(lang.value)}
                >
                    <span className="flex items-center">
                        <Avatar
                            size={18}
                            shape="circle"
                            src={`/img/countries/${lang.flag}.png`}
                        />
                        <span className="ltr:ml-2 rtl:mr-2">{lang.label}</span>
                    </span>
                    {locale === lang.value && (
                        <HiCheck className="text-emerald-500 text-lg" />
                    )}
                </Dropdown.Item>
            ))}
        </Dropdown>
    )
}

const LanguageSelector = withHeaderItem(_LanguageSelector)

export default LanguageSelector
