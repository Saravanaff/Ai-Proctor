let _globalExamSettings : any;

export const setExamSettings = (data : any) => {
    _globalExamSettings = data;
}
export const getExamSettings = () => {
    return _globalExamSettings;   
}