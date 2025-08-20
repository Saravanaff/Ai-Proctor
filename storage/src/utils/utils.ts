
export const generateFileName = (user_id: string,category: string) => {
    const res = user_id + "@" + category;
    return res;
}