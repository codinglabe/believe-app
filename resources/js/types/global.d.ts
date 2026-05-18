declare global {
    function route(name: string, params?: object | string | number, absolute?: boolean): string;
}
export {};
