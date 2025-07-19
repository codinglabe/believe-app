import AppLayout from "@/layouts/app-layout"
import { Head, Link } from "@inertiajs/react"

export default function Show({ auth, nodeBoss }) {
  return (
    <AppLayout>
      <Head title={`NodeBoss - ${nodeBoss.name}`} />

      <div className="py-12">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 text-gray-900">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">{nodeBoss.name}</h1>
                <div className="flex space-x-2">
                  <Link
                    href={route("node-boss.edit", nodeBoss.id)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700"
                  >
                    Edit
                  </Link>
                  <Link
                    href={route("node-boss.index")}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700"
                  >
                    Back to List
                  </Link>
                </div>
              </div>

              {/* Image */}
              <div className="mb-6">
                {nodeBoss.image_url ? (
                  <div className="flex justify-center">
                    <img
                      src={nodeBoss.image_url || "/placeholder.svg"}
                      alt={nodeBoss.name}
                      className="rounded-lg shadow-lg"
                      style={{ width: "436px", height: "196px", objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="w-96 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Name</label>
                      <p className="text-gray-900">{nodeBoss.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Status</label>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          nodeBoss.status === "active"
                            ? "bg-green-100 text-green-800"
                            : nodeBoss.status === "inactive"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {nodeBoss.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Investment Status</label>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          nodeBoss.is_closed ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {nodeBoss.is_closed ? "Closed for Investment" : "Open for Investment"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Created</label>
                      <p className="text-gray-900">{new Date(nodeBoss.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Suggested Amounts */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Suggested Investment Amounts</h3>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(nodeBoss.suggested_amounts)?.map((amount, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        ${amount}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{nodeBoss.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
