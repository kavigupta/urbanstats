// based on https://khuang159.medium.com/creating-a-hamburger-menu-in-react-f22e5ae442cb

export { Nav };

import React, { useState } from 'react';

import "../common.css";



function Hamburger({ isOpen }) {
    return (
        <>
            <div className="hamburger">
                <div className="burger burger1" />
                <div className="burger burger2" />
                <div className="burger burger3" />
            </div>

            <style jsx>{`
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
                    background-color: black;
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

                
            `}</style>
        </>
    )
}

function Nav({ hamburger_open, set_hamburger_open }) {

    const toggleHamburger = () => {
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


            <style jsx>{`

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
                    padding-top: 10px;
                    margin-left: 10px;
                    z-index: 6;
                }

            
                
                .navigation-entry {
                    display: ${hamburger_open ? 'inline' : 'none'};
                    background-color: #eee;
                    min-height: 100vh;
                    width: 75vw;
                    margin-top: 50px;
                    position: fixed;
                    z-index: 10000;                    

                }
            `}</style>
        </div>
    )

}