// A phone number as we save and send it: "+", then the country code (never starting with 0) and the number, 7 to 15
// digits in all. Whether it is a real mobile number is checked only where it is typed (see checkPhone).
export const isPhone = (value: unknown): value is string => typeof value === 'string' && /^\+[1-9]\d{6,14}$/.test(value);
