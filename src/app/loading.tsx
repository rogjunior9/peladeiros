import { Loader } from "@/components/ui/loader";

export default function Loading() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B]">
            <Loader text="Carregando..." />
        </div>
    );
}
