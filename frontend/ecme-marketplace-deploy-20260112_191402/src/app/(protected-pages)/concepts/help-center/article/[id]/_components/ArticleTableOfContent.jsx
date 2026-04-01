'use client'
import Card from '@/components/ui/Card'
import Affix from '@/components/shared/Affix'
import useLayoutGap from '@/utils/hooks/useLayoutGap'
// eslint-disable-next-line import/named
import { Link } from 'react-scroll'

const ArticleTableOfContent = ({ content }) => {
    const { getTopGapValue } = useLayoutGap()

    return (
        <>
            <div className="lg:w-[380px] mt-6 md:px-8 hidden lg:block">
                <Affix offset={getTopGapValue()}>
                    <Card>
                        <h6 className="font-bold">In this page</h6>
                        <ul className="text-gray-500 dark:text-gray-400 font-medium mt-4 relative">
                            {content.map((link) => (
                                <li key={`anchor${link.id}`}>
                                    <Link
                                        activeClass="text-primary dark:text-gray-50 after:content-[''] after:absolute after:-left-5 after:bg-primary after:w-[2px] after:h-5"
                                        className="cursor-pointer block transform transition-colors duration-200 py-2 hover:text-primary dark:hover:text-gray-100 "
                                        to={link.id}
                                        spy={true}
                                        smooth={true}
                                        duration={500}
                                        offset={-80}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </Affix>
            </div>
        </>
    )
}

export default ArticleTableOfContent
