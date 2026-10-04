import { useCartContext } from "../CartHook/cart";

const OrderPage = () =>{
    return(
        <div className="flex fle-col h-[calc(100vh-180px)] px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
            <h1>Oder Details</h1>

            <div className="">
                <span className="font-medium">Order Id</span>
                <span className="">{order.order?.id}</span>
            </div>

            <div className="">
                <span className="font-medium">Receiver Name</span>
                <span className="">{order.order?.id}</span>
            </div>

            <div className="">
                <span className="font-medium">Order Id</span>
                <span className="">{order.order?.id}</span>
            </div>

            <div className="">
                <span className="font-medium">Order Id</span>
                <span className="">{order.order?.id}</span>
            </div>

            <div className="">
                <span className="font-medium">Order Id</span>
                <span className="">{order.order?.id}</span>
            </div>

            <div className="">
                <span className="font-medium">Order Id</span>
                <span className="">{order.order?.id}</span>
            </div>

            <div className="">
                <span className="font-medium">Order Id</span>
                <span className="">{order.order?.id}</span>
            </div>

            <div className="">
                <span className="font-medium">Order Id</span>
                <span className="">{order.order?.id}</span>
            </div>

            <div className="">
                <span className="font-medium">Order Id</span>
                <span className="">{order.order?.id}</span>
            </div>
        </div>
    )
}