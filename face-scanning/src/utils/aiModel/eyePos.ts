export function eye_direction(p1: any, p2: any, p3: any, p4: any, eye: string, width: number, height: number) {

    let gaze_direction = "unknown";
    let o_cor = get_landmarks(p1, width, height);
    let i_cor = get_landmarks(p2, width, height);
    let iris_left = get_landmarks(p3, width, height);
    let iris_right = get_landmarks(p4, width, height);

    let eye_width = o_cor.norm - i_cor.norm;
    let iris_center = (iris_right.norm + iris_left.norm) / 2;
    let iris_ratio = (iris_center - i_cor.norm) / eye_width

    if (eye == "right") {
        if (iris_ratio < 0.40) gaze_direction = "left";
        else if (iris_ratio > 0.60) gaze_direction = "right";
        else gaze_direction = "center";
    }
    else {
        if (iris_ratio < 0.40) gaze_direction = "right";
        else if (iris_ratio > 0.60) gaze_direction = "left";
        else gaze_direction = "center";
    }
    return gaze_direction;

}

function get_landmarks(points: any, w: number, h: number) {
    let width = w || 640;
    let height = h || 480;
    let marking = {
        x: points.x * width,
        y: points.y * height,
        norm: points.x
    };
    return marking;
}