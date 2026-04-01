'use client'
const GalleryImage = (props) => {
    const { galleryItem, onImageClick } = props

    return (
        <div
            key={galleryItem.id}
            className="rounded-lg cursor-pointer relative group"
            onClick={() => onImageClick(galleryItem)}
        >
            <img
                className="rounded-xl w-full"
                src={galleryItem.image}
                alt={galleryItem.id}
            />
        </div>
    )
}

export default GalleryImage
