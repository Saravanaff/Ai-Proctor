
export const generateFileName = (user_id: string | undefined,exam_id: string | undefined,category: string | undefined) => {
    const res = user_id + "@" + exam_id + "@" + category;
    return res;
}