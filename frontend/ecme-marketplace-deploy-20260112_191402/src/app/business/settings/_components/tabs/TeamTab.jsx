'use client'
import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Tag from '@/components/ui/Tag'
import Tooltip from '@/components/ui/Tooltip'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { PiUserPlus, PiUpload } from 'react-icons/pi'
import { TbPencil, TbTrash } from 'react-icons/tb'
import Upload from '@/components/ui/Upload'
import LaravelAxios from '@/services/axios/LaravelAxios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getTeamMembers, 
    createTeamMember, 
    updateTeamMember, 
    deleteTeamMember 
} from '@/lib/api/business'
import Loading from '@/components/shared/Loading'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const TeamTab = () => {
    const queryClient = useQueryClient()
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingMember, setEditingMember] = useState(null)

    // Функция для получения инициалов
    const getInitials = (name) => {
        if (!name) return 'U'
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name[0].toUpperCase()
    }

    const { data: teamMembers = [], isLoading } = useQuery({
        queryKey: ['business-team'],
        queryFn: getTeamMembers,
    })

    const createMemberMutation = useMutation({
        mutationFn: createTeamMember,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-team'] })
            setIsAddModalOpen(false)
            toast.push(
                <Notification title="Успешно" type="success">
                    Член команды успешно добавлен
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось добавить члена команды
                </Notification>,
            )
        },
    })

    const updateMemberMutation = useMutation({
        mutationFn: ({ id, data }) => updateTeamMember(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-team'] })
            setEditingMember(null)
            toast.push(
                <Notification title="Успешно" type="success">
                    Член команды успешно обновлен
                </Notification>,
            )
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось обновить члена команды
                </Notification>,
            )
        },
    })

    const deleteMemberMutation = useMutation({
        mutationFn: deleteTeamMember,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['business-team'] })
            toast.push(
                <Notification title="Успешно" type="success">
                    Член команды успешно удален
                </Notification>,
            )
            setIsDeleteDialogOpen(false)
            setMemberToDelete(null)
        },
        onError: () => {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось удалить члена команды
                </Notification>,
            )
        },
    })

    const handleAdd = () => {
        setEditingMember(null)
        setIsAddModalOpen(true)
    }

    const handleEdit = (member) => {
        setEditingMember(member)
        setIsAddModalOpen(true)
    }

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [memberToDelete, setMemberToDelete] = useState(null)

    const handleDelete = (memberId) => {
        setMemberToDelete(memberId)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = () => {
        if (memberToDelete) {
            deleteMemberMutation.mutate(memberToDelete)
            setIsDeleteDialogOpen(false)
            setMemberToDelete(null)
        }
    }

    const handleSave = (memberData) => {
        if (editingMember) {
            updateMemberMutation.mutate({
                id: editingMember.id,
                data: memberData,
            })
        } else {
            createMemberMutation.mutate({
                ...memberData,
                status: 'active',
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loading loading />
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                    <div className="flex-1">
                        <h4>Команда</h4>
                        <p className="text-sm text-gray-500 mt-1">
                            Управление мастерами и сотрудниками
                        </p>
                    </div>
                    <Button variant="solid" icon={<PiUserPlus />} onClick={handleAdd} className="w-full sm:w-auto shrink-0">
                        Добавить сотрудника
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {teamMembers.map((member) => (
                        <Card key={member.id} className="p-4 sm:p-6 w-full">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {member.img ? (
                                        <Avatar size={50} shape="circle" src={member.img} />
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                                            {getInitials(member.name)}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{member.name}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{member.role}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Tooltip title="Редактировать">
                                        <div
                                            className="text-xl cursor-pointer hover:text-primary"
                                            onClick={() => handleEdit(member)}
                                        >
                                            <TbPencil />
                                        </div>
                                    </Tooltip>
                                    <Tooltip title="Удалить">
                                        <div
                                            className="text-xl cursor-pointer hover:text-red-600"
                                            onClick={() => handleDelete(member.id)}
                                        >
                                            <TbTrash />
                                        </div>
                                    </Tooltip>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Tag
                                    className={
                                        member.status === 'active'
                                            ? 'bg-emerald-200 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-100'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                    }
                                >
                                    {member.status === 'active' ? 'Активен' : 'Неактивен'}
                                </Tag>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <TeamMemberModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false)
                    setEditingMember(null)
                }}
                member={editingMember}
                onSave={handleSave}
            />
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                type="danger"
                title="Удалить члена команды?"
                onCancel={() => {
                    setIsDeleteDialogOpen(false)
                    setMemberToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                confirmText="Удалить"
                cancelText="Отмена"
            >
                <p>Вы уверены, что хотите удалить этого члена команды?</p>
            </ConfirmDialog>
        </>
    )
}

const TeamMemberModal = ({ isOpen, onClose, member, onSave }) => {
    const [formData, setFormData] = useState({
        name: member?.name || '',
        role: member?.role || '',
        img: member?.img || '',
    })
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

    // Функция для получения инициалов
    const getInitials = (name) => {
        if (!name) return 'U'
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name[0].toUpperCase()
    }

    useEffect(() => {
        if (member) {
            setFormData({
                name: member.name || '',
                role: member.role || '',
                img: member.img || '',
            })
        } else {
            setFormData({
                name: '',
                role: '',
                img: '',
            })
        }
    }, [member, isOpen])

    const handleAvatarUpload = async (files) => {
        if (!files || files.length === 0) return
        
        const file = files[0]
        setIsUploadingAvatar(true)
        
        try {
            const uploadFormData = new FormData()
            uploadFormData.append('image', file)
            
            // Используем тот же endpoint что и для объявлений, или можно создать отдельный для команды
            const response = await LaravelAxios.post('/business/settings/advertisements/upload-image', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            
            setFormData(prev => ({ ...prev, img: response.data.url }))
            toast.push(
                <Notification title="Успешно" type="success">
                    Аватар загружен
                </Notification>
            )
        } catch (error) {
            toast.push(
                <Notification title="Ошибка" type="danger">
                    Не удалось загрузить аватар: {error.response?.data?.message || error.message}
                </Notification>
            )
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} width={500}>
            <div className="flex flex-col h-full max-h-[85vh]">
                {/* Заголовок */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h4 className="text-lg">
                        {member ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
                    </h4>
                </div>
                
                {/* Скроллируемый контент */}
                <div className="flex-1 overflow-y-auto booking-modal-scroll px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4" id="team-form">
                        <FormItem label="Аватар">
                            <div className="space-y-3">
                                {formData.img ? (
                                    <div className="flex justify-center">
                                        <Avatar size={80} shape="circle" src={formData.img} />
                                    </div>
                                ) : (
                                    <div className="flex justify-center">
                                        <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-medium text-gray-700 dark:text-gray-300">
                                            {getInitials(formData.name)}
                                        </div>
                                    </div>
                                )}
                                <Upload
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    disabled={isUploadingAvatar}
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        icon={<PiUpload />}
                                        loading={isUploadingAvatar}
                                        block
                                    >
                                        {formData.img ? 'Изменить аватар' : 'Загрузить аватар'}
                                    </Button>
                                </Upload>
                                <p className="text-xs text-gray-500 text-center">
                                    Рекомендуемый размер: 400x400px
                                </p>
                            </div>
                        </FormItem>
                        <FormItem label="Имя" required>
                            <Input
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="Имя Фамилия"
                                required
                            />
                        </FormItem>
                        <FormItem label="Должность">
                            <Input
                                value={formData.role}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                                }
                                placeholder="Например: Мастер, Администратор"
                            />
                        </FormItem>
                    </form>
                </div>

                {/* Кнопки - зафиксированы снизу */}
                <div className="flex-shrink-0 px-6 pt-4 pb-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <Button type="button" variant="plain" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button 
                        type="button" 
                        variant="solid"
                        onClick={(e) => {
                            e.preventDefault()
                            const form = document.getElementById('team-form')
                            if (form) {
                                form.requestSubmit()
                            }
                        }}
                    >
                        Сохранить
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export default TeamTab
