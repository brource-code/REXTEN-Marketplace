'use client'
import React from 'react'

// Simple Integration Item Component
const IntegrationItem = ({ icon, name, description }) => {
    return (
        <div className="flex items-center justify-between py-5 px-6 bg-[#FBFBFB] rounded-lg border border-gray-100 mb-3 group hover:border-gray-200 transition-all">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 flex items-center justify-center pt-1 text-gray-700 shrink-0">
                    {icon}
                </div>
                <div>
                    <h4 className="text-sm font-medium text-gray-900">{name}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xl whitespace-pre-line">{description}</p>
                </div>
            </div>
            <button className="shrink-0 px-4 py-1.5 text-xs font-medium border border-gray-200 rounded-md text-gray-700 hover:bg-white hover:shadow-sm transition-all bg-transparent">
                Connect <span className="ml-1 text-gray-400 inline-block">↗</span>
            </button>
        </div>
    )
}

export default function IntegrationsContent() {
    return (
        <div className="max-w-5xl px-8 py-8">
            <div className="mb-8">
                <h1 className="text-xl font-medium text-gray-900 mb-1">Integrations</h1>
            </div>

            <div className="bg-white rounded-xl mb-12">
                <IntegrationItem
                    icon={
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                    }
                    name="GitHub"
                    description="Connect GitHub for Cloud Agents, Bugbot and enhanced codebase context"
                />

                <IntegrationItem
                    icon={
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-orange-600">
                            <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44 7.51L12 20.47l7.29-3.29 2.44-7.51 1.22 3.78a.84.84 0 0 1-.3.94zM24 12a.84.84 0 0 1-.3.94l-8.03 5.83-8.32-11.53L12 2.62l4.65 4.62 7.05 4.76zM12 20.47l-7.29-3.29L2.27 9.67 12 2.62l9.73 7.05-2.43 7.51L12 20.47z" />
                        </svg>
                    }
                    name="GitLab"
                    description="Connect GitLab for Cloud Agents, Bugbot and enhanced codebase context"
                />

                <IntegrationItem
                    icon={
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.52v-6.315zm8.834-5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 15.147 5.08a2.527 2.527 0 0 1 2.521 2.52v2.523H15.147zM8.834 6.313a2.528 2.528 0 0 1 2.521-2.521 2.528 2.528 0 0 1 2.521 2.521v2.52H8.834V6.313zm11.355 2.52a2.528 2.528 0 0 1-2.522-2.52A2.528 2.528 0 0 1 20.19 3.79a2.527 2.527 0 0 1 2.521 2.52v2.523zm-1.26 1.26a2.527 2.527 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.52h-6.315V10.093h6.315zm-2.52 10.096a2.528 2.528 0 0 1-2.522 2.52 2.528 2.528 0 0 1-2.521-2.52v-2.52h5.043v2.52zm-5.043-1.26a2.527 2.527 0 0 1-2.52-2.52 2.527 2.527 0 0 1 2.52-2.52h2.52v5.04h-2.52z" />
                        </svg>
                    }
                    name="Slack"
                    description={`Work with Cloud Agents from Slack\nSlack integration is not supported in Privacy Mode (Legacy). You must change your privacy setting in the Cursor app (version 1.1+).\nLearn more`}
                />

                <IntegrationItem
                    icon={<div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-white text-[10px] font-bold">L</div>}
                    name="Linear"
                    description="Connect a Linear workspace to delegate issues to Cloud Agents"
                />
            </div>

            <div className="mt-12">
                <h3 className="text-sm font-medium text-gray-500 mb-2">User API Keys</h3>
                <p className="text-xs text-gray-400 mb-6 max-w-3xl leading-relaxed">
                    User API Keys provide secure, programmatic access to your Cursor account, including the headless version of the Cursor Agent CLI and Cloud Agent API. Treat them like passwords summary keep them secure and never share them publicly. Note: The Cloud Agent API is in beta.
                </p>

                <div className="bg-[#FBFBFB] rounded-lg border border-gray-100 py-16 flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-gray-900 font-medium mb-1">No API Keys Yet</p>
                    <p className="text-xs text-gray-500 mb-5">No API Keys have been created yet</p>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
                        <span>+</span> New API Key
                    </button>
                </div>
            </div>
        </div>
    )
}
