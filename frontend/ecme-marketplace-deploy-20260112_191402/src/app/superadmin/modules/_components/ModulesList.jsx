'use client'
import { useState } from 'react'
import Card from '@/components/ui/Card'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Checkbox from '@/components/ui/Checkbox'
import { PiGear, PiInfo } from 'react-icons/pi'
import { TbX } from 'react-icons/tb'
import Tooltip from '@/components/ui/Tooltip'

const businessTypes = [
    { id: 'salon', label: 'Салоны красоты' },
    { id: 'repair', label: 'Ремонтные услуги' },
    { id: 'photo', label: 'Фотостудии' },
    { id: 'fitness', label: 'Фитнес' },
    { id: 'medical', label: 'Медицина' },
    { id: 'other', label: 'Другое' },
]

const ModuleAvailabilityModal = ({ isOpen, onClose, module }) => {
    const [availableTypes, setAvailableTypes] = useState(
        module?.availableFor || []
    )

    const handleTypeToggle = (typeId) => {
        setAvailableTypes((prev) => {
            if (prev.includes(typeId)) {
                return prev.filter((id) => id !== typeId)
            } else {
                return [...prev, typeId]
            }
        })
    }

    const handleSave = () => {
        // TODO: Сохранить настройки доступности через API
        console.log('Save module availability:', module.id, availableTypes)
        onClose()
    }

    if (!module) return null

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок - зафиксирован сверху */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Доступность модуля</h4>
                        <p className="text-sm text-gray-500 mt-1">{module.name}</p>
                    </div>
                    <Button
                        variant="plain"
                        size="sm"
                        icon={<TbX />}
                        onClick={onClose}
                    />
                </div>

                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold mb-3">
                                Доступен для типов бизнесов:
                            </p>
                            <div className="space-y-2">
                                {businessTypes.map((type) => (
                                    <div
                                        key={type.id}
                                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        <Checkbox
                                            checked={availableTypes.includes(type.id)}
                                            onChange={() => handleTypeToggle(type.id)}
                                        />
                                        <span className="text-sm">{type.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Кнопки - зафиксированы снизу */}
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button variant="plain" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button variant="solid" onClick={handleSave}>
                        Сохранить
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

const ModulesList = ({ modules = [] }) => {
    const [selectedModule, setSelectedModule] = useState(null)
    const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)

    const handleToggle = (moduleId, enabled) => {
        // TODO: Сохранить состояние модуля через API
        console.log('Toggle module:', moduleId, enabled)
    }

    const handleAvailability = (module) => {
        setSelectedModule(module)
        setIsAvailabilityModalOpen(true)
    }

    return (
        <Card>
            <div className="mb-6">
                <h3>Модули системы</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Управление модулями и функциями платформы
                </p>
            </div>

            <div className="space-y-4">
                {modules.map((module) => (
                    <div
                        key={module.id}
                        className="flex items-start justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h4>{module.name}</h4>
                                {module.required && (
                                    <Badge className="bg-amber-500">
                                        Обязательный
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-500">
                                {module.description}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Tooltip title="Настройка доступности для типов бизнесов">
                                <Button
                                    variant="plain"
                                    size="sm"
                                    icon={<PiGear />}
                                    onClick={() => handleAvailability(module)}
                                />
                            </Tooltip>
                            <FormItem className="mb-0">
                                <Switcher
                                    checked={module.enabled}
                                    disabled={module.required}
                                    onChange={(checked) =>
                                        handleToggle(module.id, checked)
                                    }
                                />
                            </FormItem>
                        </div>
                    </div>
                ))}
            </div>
            <ModuleAvailabilityModal
                isOpen={isAvailabilityModalOpen}
                onClose={() => {
                    setIsAvailabilityModalOpen(false)
                    setSelectedModule(null)
                }}
                module={selectedModule}
            />
        </Card>
    )
}

export default ModulesList

