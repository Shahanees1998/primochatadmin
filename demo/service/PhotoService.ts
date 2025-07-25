import type { Demo } from "@/types/index";

export const PhotoService = {
    getImages() {
        return fetch("/demo/data/photos.json", {
            headers: { "Cache-Control": "no-cache" },
        })
            .then((res) => res.json())
            .then((d) => d.data as Demo.Photo[]);
    },
};
