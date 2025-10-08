let _tabSwitchViolations : number = 0;
let _numberOfMicrophones : number = 0;


export const setTabSwitchViolations = (count : number) => {
    _tabSwitchViolations = count;
}
export const setNumberOfMicrophones = (count : number) => {
    _numberOfMicrophones = count;
}

export const incrementTabSwitchViolations = () => {
    _tabSwitchViolations++;
}

export const getTabSwitchViolations = () : number => {
    return _tabSwitchViolations;
}
export const getNumberOfMicrophones = () : number => {
    return _numberOfMicrophones;
}