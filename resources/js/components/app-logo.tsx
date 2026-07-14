export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-transparent">
                <img
                    src="/agro-logo-sidebar.png"
                    alt="Agrovision"
                    className="size-8 object-contain"
                />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold tracking-wide text-[#1a2b4c] dark:text-sidebar-foreground">
                    Agrovision
                </span>
            </div>
        </>
    );
}
