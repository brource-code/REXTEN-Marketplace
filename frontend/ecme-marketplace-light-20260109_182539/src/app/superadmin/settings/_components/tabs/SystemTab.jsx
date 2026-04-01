'use client'
import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { FormItem, FormContainer } from '@/components/ui/Form'
import Switcher from '@/components/ui/Switcher'
import Card from '@/components/ui/Card'

const SystemTab = () => {
    const [formData, setFormData] = useState({
        maintenanceMode: false,
        registrationEnabled: true,
        emailVerification: true,
        smsVerification: false,
        twoFactorAuth: false,
        sessionTimeout: 30,
        maxUploadSize: 10,
        cacheEnabled: true,
        cacheDuration: 60,
        logLevel: 'info',
        apiRateLimit: 100,
    })

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        // TODO: Сохранить данные через API
        console.log('Save system settings:', formData)
    }

    return (
        <FormContainer>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                    {/* Режим обслуживания */}
                    <Card className="p-4">
                        <h4 className="mb-4">Режим обслуживания</h4>
                        <div className="space-y-4">
                            <FormItem label="Включить режим обслуживания">
                                <Switcher
                                    checked={formData.maintenanceMode}
                                    onChange={(checked) =>
                                        handleChange('maintenanceMode', checked)
                                    }
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    При включении сайт будет недоступен для пользователей
                                </p>
                            </FormItem>
                        </div>
                    </Card>

                    {/* Регистрация и авторизация */}
                    <Card className="p-4">
                        <h4 className="mb-4">Регистрация и авторизация</h4>
                        <div className="space-y-4">
                            <FormItem label="Разрешить регистрацию">
                                <Switcher
                                    checked={formData.registrationEnabled}
                                    onChange={(checked) =>
                                        handleChange('registrationEnabled', checked)
                                    }
                                />
                            </FormItem>
                            <FormItem label="Требовать подтверждение email">
                                <Switcher
                                    checked={formData.emailVerification}
                                    onChange={(checked) =>
                                        handleChange('emailVerification', checked)
                                    }
                                />
                            </FormItem>
                            <FormItem label="Требовать подтверждение SMS">
                                <Switcher
                                    checked={formData.smsVerification}
                                    onChange={(checked) =>
                                        handleChange('smsVerification', checked)
                                    }
                                />
                            </FormItem>
                            <FormItem label="Двухфакторная аутентификация">
                                <Switcher
                                    checked={formData.twoFactorAuth}
                                    onChange={(checked) =>
                                        handleChange('twoFactorAuth', checked)
                                    }
                                />
                            </FormItem>
                        </div>
                    </Card>

                    {/* Безопасность */}
                    <Card className="p-4">
                        <h4 className="mb-4">Безопасность</h4>
                        <div className="space-y-4">
                            <FormItem label="Таймаут сессии (минут)">
                                <Input
                                    type="number"
                                    value={formData.sessionTimeout}
                                    onChange={(e) =>
                                        handleChange(
                                            'sessionTimeout',
                                            parseInt(e.target.value) || 30
                                        )
                                    }
                                />
                            </FormItem>
                            <FormItem label="Лимит API запросов (в минуту)">
                                <Input
                                    type="number"
                                    value={formData.apiRateLimit}
                                    onChange={(e) =>
                                        handleChange(
                                            'apiRateLimit',
                                            parseInt(e.target.value) || 100
                                        )
                                    }
                                />
                            </FormItem>
                        </div>
                    </Card>

                    {/* Файлы и загрузки */}
                    <Card className="p-4">
                        <h4 className="mb-4">Файлы и загрузки</h4>
                        <div className="space-y-4">
                            <FormItem label="Максимальный размер файла (МБ)">
                                <Input
                                    type="number"
                                    value={formData.maxUploadSize}
                                    onChange={(e) =>
                                        handleChange(
                                            'maxUploadSize',
                                            parseInt(e.target.value) || 10
                                        )
                                    }
                                />
                            </FormItem>
                        </div>
                    </Card>

                    {/* Кэширование */}
                    <Card className="p-4">
                        <h4 className="mb-4">Кэширование</h4>
                        <div className="space-y-4">
                            <FormItem label="Включить кэширование">
                                <Switcher
                                    checked={formData.cacheEnabled}
                                    onChange={(checked) =>
                                        handleChange('cacheEnabled', checked)
                                    }
                                />
                            </FormItem>
                            {formData.cacheEnabled && (
                                <FormItem label="Длительность кэша (минут)">
                                    <Input
                                        type="number"
                                        value={formData.cacheDuration}
                                        onChange={(e) =>
                                            handleChange(
                                                'cacheDuration',
                                                parseInt(e.target.value) || 60
                                            )
                                        }
                                    />
                                </FormItem>
                            )}
                        </div>
                    </Card>

                    {/* Логирование */}
                    <Card className="p-4">
                        <h4 className="mb-4">Логирование</h4>
                        <div className="space-y-4">
                            <FormItem label="Уровень логирования">
                                <Input
                                    value={formData.logLevel}
                                    onChange={(e) =>
                                        handleChange('logLevel', e.target.value)
                                    }
                                    placeholder="info, warning, error, debug"
                                />
                            </FormItem>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="plain">
                            Отмена
                        </Button>
                        <Button type="submit" variant="solid">
                            Сохранить
                        </Button>
                    </div>
                </div>
            </form>
        </FormContainer>
    )
}

export default SystemTab

