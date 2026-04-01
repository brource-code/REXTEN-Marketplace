<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    /**
     * Get public platform settings (for logo customization, no auth required).
     */
    public function getPublicSettings(Request $request)
    {
        try {
            $settings = DB::table('platform_settings')->first();
            
            if (!$settings) {
                // Создаем настройки по умолчанию
                $settings = (object) [
                    'id' => 1,
                    'logo_text' => 'REXTEN',
                    'logo_color_light' => '#0F172A',
                    'logo_color_dark' => '#FFFFFF',
                    'logo_size' => 26,
                    'logo_icon_color_light' => '#2563EB',
                    'logo_icon_color_dark' => '#696cff',
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'logoText' => $settings->logo_text ?? 'REXTEN',
                    'logoColorLight' => $settings->logo_color_light ?? '#0F172A',
                    'logoColorDark' => $settings->logo_color_dark ?? '#FFFFFF',
                    'logoSize' => $settings->logo_size ?? 26,
                    'logoIconColorLight' => $settings->logo_icon_color_light ?? '#2563EB',
                    'logoIconColorDark' => $settings->logo_icon_color_dark ?? '#696cff',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке настроек',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get platform settings.
     */
    public function getGeneral(Request $request)
    {
        try {
            $settings = DB::table('platform_settings')->first();
            
            if (!$settings) {
                // Создаем настройки по умолчанию
                $settings = (object) [
                    'id' => 1,
                    'site_name' => 'Ecme Marketplace',
                    'site_description' => 'Платформа для управления бизнесом',
                    'contact_email' => null,
                    'contact_phone' => null,
                    'logo_light' => null,
                    'logo_dark' => null,
                    'logo_icon_light' => null,
                    'logo_icon_dark' => null,
                    'logo_text' => 'REXTEN',
                    'logo_color_light' => '#0F172A',
                    'logo_color_dark' => '#FFFFFF',
                    'logo_size' => 26,
                    'logo_icon_color_light' => '#2563EB',
                    'logo_icon_color_dark' => '#696cff',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'siteName' => $settings->site_name,
                    'siteDescription' => $settings->site_description,
                    'contactEmail' => $settings->contact_email,
                    'contactPhone' => $settings->contact_phone,
                    'logoLight' => $settings->logo_light,
                    'logoDark' => $settings->logo_dark,
                    'logoIconLight' => $settings->logo_icon_light,
                    'logoIconDark' => $settings->logo_icon_dark,
                    'logoText' => $settings->logo_text ?? 'REXTEN',
                    'logoColorLight' => $settings->logo_color_light ?? '#0F172A',
                    'logoColorDark' => $settings->logo_color_dark ?? '#FFFFFF',
                    'logoSize' => $settings->logo_size ?? 26,
                    'logoIconColorLight' => $settings->logo_icon_color_light ?? '#2563EB',
                    'logoIconColorDark' => $settings->logo_icon_color_dark ?? '#696cff',
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке настроек',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update platform settings.
     */
    public function updateGeneral(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'siteName' => 'sometimes|string|max:255',
                'siteDescription' => 'nullable|string',
                'contactEmail' => 'nullable|email|max:255',
                'contactPhone' => 'nullable|string|max:20',
                'logoText' => 'sometimes|string|max:50',
                'logoColorLight' => 'sometimes|string|max:20',
                'logoColorDark' => 'sometimes|string|max:20',
                'logoSize' => 'sometimes|integer|min:12|max:48',
                'logoIconColorLight' => 'sometimes|string|max:20',
                'logoIconColorDark' => 'sometimes|string|max:20',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $settings = DB::table('platform_settings')->first();
            
            $data = [];
            if ($request->has('siteName')) {
                $data['site_name'] = $request->input('siteName');
            }
            if ($request->has('siteDescription')) {
                $data['site_description'] = $request->input('siteDescription');
            }
            if ($request->has('contactEmail')) {
                $data['contact_email'] = $request->input('contactEmail');
            }
            if ($request->has('contactPhone')) {
                $data['contact_phone'] = $request->input('contactPhone');
            }
            if ($request->has('logoText')) {
                $data['logo_text'] = $request->input('logoText');
            }
            if ($request->has('logoColorLight')) {
                $data['logo_color_light'] = $request->input('logoColorLight');
            }
            if ($request->has('logoColorDark')) {
                $data['logo_color_dark'] = $request->input('logoColorDark');
            }
            if ($request->has('logoSize')) {
                $data['logo_size'] = $request->input('logoSize');
            }
            if ($request->has('logoIconColorLight')) {
                $data['logo_icon_color_light'] = $request->input('logoIconColorLight');
            }
            if ($request->has('logoIconColorDark')) {
                $data['logo_icon_color_dark'] = $request->input('logoIconColorDark');
            }
            $data['updated_at'] = now();

            if ($settings) {
                DB::table('platform_settings')->where('id', $settings->id)->update($data);
            } else {
                $data['created_at'] = now();
                DB::table('platform_settings')->insert($data);
            }

            return response()->json([
                'success' => true,
                'message' => 'Настройки успешно обновлены',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при обновлении настроек',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload logo (light or dark version).
     */
    public function uploadLogo(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'logo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
                'type' => 'required|in:light,dark,iconLight,iconDark',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $type = $request->input('type');
            $file = $request->file('logo');
            
            // Сохраняем файл в storage/app/public/logos
            $path = $file->store('logos', 'public');
            $url = Storage::disk('public')->url($path);

            // Обновляем настройки
            $settings = DB::table('platform_settings')->first();
            $columnName = match($type) {
                'light' => 'logo_light',
                'dark' => 'logo_dark',
                'iconLight' => 'logo_icon_light',
                'iconDark' => 'logo_icon_dark',
            };

            if ($settings) {
                // Удаляем старый файл, если он существует
                $oldPath = $settings->$columnName;
                if ($oldPath && Storage::disk('public')->exists(str_replace('/storage/', '', parse_url($oldPath, PHP_URL_PATH)))) {
                    Storage::disk('public')->delete(str_replace('/storage/', '', parse_url($oldPath, PHP_URL_PATH)));
                }
                
                DB::table('platform_settings')
                    ->where('id', $settings->id)
                    ->update([
                        $columnName => $url,
                        'updated_at' => now(),
                    ]);
            } else {
                $data = [
                    'site_name' => 'Ecme Marketplace',
                    $columnName => $url,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                DB::table('platform_settings')->insert($data);
            }

            return response()->json([
                'success' => true,
                'url' => $url,
                'path' => $path,
                'message' => 'Логотип успешно загружен',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при загрузке логотипа',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove logo.
     */
    public function removeLogo(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'type' => 'required|in:light,dark,iconLight,iconDark',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $type = $request->input('type');
            $settings = DB::table('platform_settings')->first();
            
            if (!$settings) {
                return response()->json([
                    'success' => false,
                    'message' => 'Настройки не найдены',
                ], 404);
            }

            $columnName = match($type) {
                'light' => 'logo_light',
                'dark' => 'logo_dark',
                'iconLight' => 'logo_icon_light',
                'iconDark' => 'logo_icon_dark',
            };

            // Удаляем файл, если он существует
            $oldPath = $settings->$columnName;
            if ($oldPath && Storage::disk('public')->exists(str_replace('/storage/', '', parse_url($oldPath, PHP_URL_PATH)))) {
                Storage::disk('public')->delete(str_replace('/storage/', '', parse_url($oldPath, PHP_URL_PATH)));
            }

            DB::table('platform_settings')
                ->where('id', $settings->id)
                ->update([
                    $columnName => null,
                    'updated_at' => now(),
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Логотип успешно удален',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при удалении логотипа',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}


