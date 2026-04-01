/**
 * Форматирует длительность услуги с учетом единицы измерения
 * @param duration - Длительность (число)
 * @param unit - Единица измерения ('hours' | 'days' | 'minutes')
 * @returns Отформатированная строка длительности
 */
export function formatDuration(duration?: number | string | null, unit: 'hours' | 'days' | 'minutes' = 'hours'): string {
  if (!duration && duration !== 0) {
    return '';
  }

  const numDuration = typeof duration === 'string' ? parseFloat(duration) : duration;
  
  if (isNaN(numDuration) || numDuration === 0) {
    return '';
  }

  if (unit === 'minutes') {
    // Для минут (дополнительные услуги хранятся в минутах)
    const hours = Math.floor(numDuration / 60);
    const minutes = numDuration % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours} ${getHourWord(hours)} ${minutes} ${getMinuteWord(minutes)}`;
    } else if (hours > 0) {
      return `${hours} ${getHourWord(hours)}`;
    } else {
      return `${minutes} ${getMinuteWord(minutes)}`;
    }
  } else if (unit === 'days') {
    // Для дней
    const days = Math.floor(numDuration);
    const hours = Math.floor((numDuration - days) * 24);
    
    if (hours > 0) {
      return `${days} ${getDayWord(days)} ${hours} ${getHourWord(hours)}`;
    }
    return `${days} ${getDayWord(days)}`;
  } else {
    // Для часов (по умолчанию)
    // Если duration > 24 и unit='hours', предполагаем что это минуты и конвертируем
    let finalDuration = numDuration;
    if (numDuration > 24 && unit === 'hours') {
      // Конвертируем минуты в часы (например, 60 минут = 1 час)
      finalDuration = numDuration / 60;
    }
    
    const hours = Math.floor(finalDuration);
    const minutes = Math.floor((finalDuration - hours) * 60);
    
    if (minutes > 0) {
      return `${hours} ${getHourWord(hours)} ${minutes} ${getMinuteWord(minutes)}`;
    }
    return `${hours} ${getHourWord(hours)}`;
  }
}

/**
 * Получить правильное склонение слова "день"
 */
function getDayWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'дней';
  }
  
  if (lastDigit === 1) {
    return 'день';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'дня';
  }
  
  return 'дней';
}

/**
 * Получить правильное склонение слова "час"
 */
function getHourWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'часов';
  }
  
  if (lastDigit === 1) {
    return 'час';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'часа';
  }
  
  return 'часов';
}

/**
 * Получить правильное склонение слова "минута"
 */
function getMinuteWord(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'минут';
  }
  
  if (lastDigit === 1) {
    return 'минута';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'минуты';
  }
  
  return 'минут';
}

