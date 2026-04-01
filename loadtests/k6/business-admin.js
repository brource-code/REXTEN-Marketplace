/**
 * Нагрузочный тест бизнес-админки (Laravel API).
 *
 * Запуск (нужен k6: https://k6.io/docs/get-started/installation/):
 *   K6_API_URL=http://127.0.0.1/api
 *   (для 127.0.0.1/localhost заголовок Host=rexten.live; прямой artisan serve: K6_NGINX_HOST=)
 *   K6_EMAIL=business@ecme.com \
 *   K6_PASSWORD=password123 \
 *   k6 run loadtests/k6/business-admin.js
 *
 * Несколько аккаунтов (JSON-массив [{ "email", "password" }]):
 *   k6 run -e K6_ACCOUNTS_FILE=/abs/path/to/accounts.json loadtests/k6/business-admin.js
 *
 * Пороги и длительность можно переопределить переменными окружения (см. ниже).
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'

const baseUrl = (__ENV.K6_API_URL || 'http://127.0.0.1/api').replace(/\/$/, '')

/** Для nginx за Docker: запрос на 127.0.0.1/api с нужным server_name (см. nginx/default.conf). */
function extraHeaders() {
    const explicit = __ENV.K6_NGINX_HOST
    if (explicit === '') {
        return {}
    }
    if (explicit) {
        return { Host: explicit }
    }
    if (/127\.0\.0\.1|localhost/.test(baseUrl)) {
        return { Host: 'rexten.live' }
    }
    return {}
}

function mergeHeaders(h) {
    return Object.assign({}, extraHeaders(), h)
}

const accounts = new SharedArray('accounts', () => {
    const file = __ENV.K6_ACCOUNTS_FILE
    if (file) {
        return JSON.parse(open(file))
    }
    return [
        {
            email: __ENV.K6_EMAIL || 'business@ecme.com',
            password: __ENV.K6_PASSWORD || 'password123',
        },
    ]
})

const rampDuration = __ENV.K6_RAMP_DURATION || '1m'
const holdDuration = __ENV.K6_HOLD_DURATION || '4m'
const peakVUs = Number(__ENV.K6_PEAK_VUS || 500)

const jsonHeaders = { 'Content-Type': 'application/json' }

function authHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
    }
}

function login(acc) {
    const res = http.post(
        `${baseUrl}/auth/login`,
        JSON.stringify({ email: acc.email, password: acc.password }),
        { headers: mergeHeaders(jsonHeaders), tags: { name: 'auth/login' } },
    )
    const ok = check(res, {
        'login 200': (r) => r.status === 200,
        'login has token': (r) => {
            try {
                return !!r.json('access_token')
            } catch {
                return false
            }
        },
    })
    if (!ok || res.status !== 200) {
        return null
    }
    return res.json('access_token')
}

function businessScenario(token) {
    const h = mergeHeaders(authHeaders(token))
    const reqs = [
        ['GET', `${baseUrl}/auth/me`, null],
        ['GET', `${baseUrl}/business/dashboard/stats`, null],
        ['GET', `${baseUrl}/business/dashboard/recent-bookings`, null],
        ['GET', `${baseUrl}/business/dashboard/chart`, null],
        ['GET', `${baseUrl}/business/clients`, null],
        ['GET', `${baseUrl}/business/bookings`, null],
        ['GET', `${baseUrl}/business/schedule/slots`, null],
        ['GET', `${baseUrl}/business/reviews`, null],
    ]

    for (const [method, url] of reqs) {
        const res = http.request(method, url, null, { headers: h, tags: { name: url.replace(baseUrl, '') } })
        check(res, {
            [`${method} ${url} ok`]: (r) => r.status === 200 || r.status === 304,
        })
        sleep(0.3 + Math.random() * 1.2)
    }
}

export const options = {
    scenarios: {
        business_admin: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: rampDuration, target: peakVUs },
                { duration: holdDuration, target: peakVUs },
            ],
            gracefulRampDown: '30s',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.1'],
        http_req_duration: ['p(95)<8000'],
    },
}

let accessToken = null

export default function () {
    const acc = accounts[(__VU - 1) % accounts.length]

    if (!accessToken) {
        accessToken = login(acc)
        if (!accessToken) {
            // иначе при недоступном API тight loop сотнями тысяч POST/сек
            sleep(1)
            return
        }
    }

    businessScenario(accessToken)
    sleep(1 + Math.random() * 2)
}
