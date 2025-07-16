import Link from "next/link";
import { useContext } from "react";
import AppMenu from "./AppMenu";
import { LayoutContext } from "./context/layoutcontext";
import { MenuProvider } from "./context/menucontext";
import { LayoutState } from "../types/layout";
import Image from "next/image";

const AppSidebar = () => {
    const { setLayoutState } = useContext(LayoutContext);
    const anchor = () => {
        setLayoutState((prevLayoutState: LayoutState) => ({
            ...prevLayoutState,
            anchored: !prevLayoutState.anchored,
        }));
    };
    return (
        <>
            <div className="sidebar-header">
                <Link style={{display:'flex', alignItems: 'center' }} href="/admin" className="app-logo flex items-center justify-content-center gap-3">
                    <img src="/images/logo.svg" alt="PrimoChat Logo"  style={{height:'100px'}}/>
                    <div style={{fontSize:'2rem'}}>|</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontStyle: 'italic' }}>Admin</div>
                </Link>
                <button
                    className="layout-sidebar-anchor p-link z-2 mb-2"
                    type="button"
                    onClick={anchor}
                ></button>
            </div>

            <div className="layout-menu-container">
                <MenuProvider>
                    <AppMenu />
                </MenuProvider>
            </div>
        </>
    );
};

export default AppSidebar;
