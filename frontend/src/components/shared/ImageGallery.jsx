import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

const ImageGallery = ({ children, index = -1, slides, onClose, ...rest }) => {
    return (
        <>
            {children}
            <Lightbox
                index={index}
                slides={slides}
                {...rest}
                open={index >= 0}
                close={() => onClose?.()}
                render={{
                    slideNumber: () => null, // Скрываем счетчик слайдов (цифру рядом с фото)
                }}
            />
        </>
    )
}

export default ImageGallery
