import React from 'react'
import './App.css'
import MapComponent from '@/components/shared/MapComponent'
import PaperIO from './components/PaperIO';

function App() {

  return (
    <>
      <div className='w-full h-full' >

        {/* Main Component */}
        <div id="main-container">
          <MapComponent/>
          {/* <PaperIO /> */}
        </div>
      </div>
    </>
  )
}

export default App
