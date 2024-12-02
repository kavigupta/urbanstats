// based on https://khuang159.medium.com/creating-a-hamburger-menu-in-react-f22e5ae442cb

import React, { ReactNode } from 'react'

import '../common.css'
import { useColors } from '../page_template/colors'

function Hamburger({ isOpen }: { isOpen: boolean }): ReactNode {
    const colors = useColors()
    return (
        <>
            <div className="hamburger">
                <div className="burger burger1" />
                <div className="burger burger2" />
                <div className="burger burger3" />
            </div>

            <style>
                {`
                .hamburger{
                    width: 2rem;
                    height: 2rem;
                    display: flex;
                    justify-content: space-around;
                    flex-flow: column nowrap;
                    z-index: 10;
                }

                .burger{
                    width: 2rem;
                    height: 0.25rem;
                    border-radius: 10px;
                    background-color: ${colors.textMain};
                    transform-origin: 1px;
                    transition: all 0.3s linear;
                }

                .burger1{
                    transform: ${isOpen ? 'rotate(45deg)' : 'rotate(0)'};
                }
                .burger2{
                    transform: ${isOpen ? 'translateX(100%)' : 'translateX(0)'};
                    opacity: ${isOpen ? 0 : 1};
                }
                .burger3{
                    transform: ${isOpen ? 'rotate(-45deg)' : 'rotate(0)'};
                }

                
            `}
            </style>
        </>
    )
}

export function Nav({ hamburger_open, set_hamburger_open }: { hamburger_open: boolean, set_hamburger_open: (newValue: boolean) => void }): ReactNode {
    const colors = useColors()
    const toggleHamburger = (): void => {
        set_hamburger_open(!hamburger_open)
    }

    return (
        <div>
            <div className="navigation">
                {/* <div className="navigation-entry">
                    {left_panel()}
                </div> */}
                <div className="hamburgermenu" onClick={toggleHamburger}>
                    <Hamburger isOpen={hamburger_open} />
                </div>
            </div>

            <style>
                {`

                .navigation{
                    width: 100%;
                    // height: 60px;
                }
                
                
                .navigation-entry{
                    display:flex;
                    flex-wrap: wrap;
                    float: right;
                    margin: 0px;
                    padding: 0px;
                    overflow: hidden;
                }


                .hamburgermenu{
                    display:fixed;
                    margin-left: 10px;
                    z-index: 6;
                }

            
                
                .navigation-entry {
                    display: ${hamburger_open ? 'inline' : 'none'};
                    background-color: ${colors.background};
                    min-height: 100vh;
                    width: 75vw;
                    margin-top: 50px;
                    position: fixed;
                    z-index: 10000;                    

                }
            `}
            </style>
        </div>
    )
}
