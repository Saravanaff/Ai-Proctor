let storedEmbeddings: number[][] = [];

export function storeEmbedding(embedding: number[][]) {
    storedEmbeddings = embedding;
}

export function getEmbeddings() {
    return storedEmbeddings;
}

export function clearEmbeddings() {
    storedEmbeddings = [];
}
