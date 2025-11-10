export function detector(result: any) {
    let phone = 0;
    let person = 0;

    if (result && result.detections && result.detections.length > 0) {
        result.detections.forEach((det: any) => {
            const category = det.categories?.[0];
            if (!category) return;

            const name = category.categoryName;

            if (name == "person") person++;
            else if (name == "cell phone") phone++;
        })
    }

    return { person, phone };

}