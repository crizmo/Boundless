import React from 'react'
import './App.css'
import MapComponent from '@/components/shared/MapComponent'

function App() {

  return (
    <>
      <div className='w-full h-full' >

        {/* Main Component */}
        <div id="main-container">
          <MapComponent/>
        </div>
      </div>
    </>
  )
}

export default App

// import React from 'react';
// import PaperIO from './components/PaperIO';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <PaperIO />
//     </div>
//   );
// }

// export default App;