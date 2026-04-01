'use server'
import { signInUserData } from '@/mock/data/authData'
import sleep from '@/utils/sleep'

const validateCredential = async (values) => {
    const { email, password } = values

    await sleep(80)

    const user = signInUserData.find(
        (user) => user.email === email && user.password === password,
    )

    return user
}

export default validateCredential
