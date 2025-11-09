export function headPos(landmarks: any[]) {
    if (!landmarks || landmarks.length < 468) return "unknown";
    const leftNose = landmarks[49];
    const rightNose = landmarks[279];
    const noseTip = landmarks[1];

    const midpoint = {
        x: ((leftNose?.x ?? 0) + (rightNose?.x ?? 0)) / 2,
        y: ((leftNose?.y ?? 0) + (rightNose?.y ?? 0)) / 2,
        z: ((leftNose?.z ?? 0) + (rightNose?.z ?? 0)) / 2,
    };

    const perpendicularUp = { x: midpoint.x, y: midpoint.y - 50, z: midpoint.z };

    const yaw = getAngleBetweenLines(midpoint, noseTip, perpendicularUp);
    const turn = getAngleBetweenLines(midpoint, rightNose, noseTip);

    let direction = "unknown";
    if (turn < 50) direction = "left";
    else if (turn > 120) direction = "right";
    else if (yaw < 100) direction = "up";
    else if (yaw > 178) direction = "down";
    else direction = "forward";

    return direction;

}

function getAngleBetweenLines(midpoint: any, point1: any, point2: any) {
    const vector1 = { x: point1.x - midpoint.x, y: point1.y - midpoint.y };
    const vector2 = { x: point2.x - midpoint.x, y: point2.y - midpoint.y };

    // Calculate the dot product of the two vectors
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;

    // Calculate the magnitudes of the vectors
    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    // Calculate the cosine of the angle between the two vectors
    const cosineTheta = dotProduct / (magnitude1 * magnitude2);

    // Use the arccosine function to get the angle in radians
    const angleInRadians = Math.acos(cosineTheta);

    // Convert the angle to degrees
    const angleInDegrees = (angleInRadians * 180) / Math.PI;

    return angleInDegrees;
}