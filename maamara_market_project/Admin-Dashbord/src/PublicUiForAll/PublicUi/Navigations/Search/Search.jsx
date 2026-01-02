import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import {
    searchOutline
} from "ionicons/icons"

const SearchBar = () => {
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();

    const formdata = new FormData(e.currentTarget);
    const name = formdata.get("name");

    if (name) {
      navigate(`/list?name=${encodeURIComponent(name)}`);
    }
  };

  return (
    <form
      className="flex items-center justify-between gap-4 p-2 rounded-md flex-1 bg-gray-100"
      onSubmit={handleSearch}
    >
      <input
        type="text"
        name="name"
        id='name'
        autoComplete='true'
        placeholder="Search"
        className="flex-1 bg-transparent outline-none rounded-full ring-1 z-10"
      />
      <button type="submit" className="cursor-pointer items-center flex primary-button">
        <IonIcon icon={searchOutline}/>
      </button>
    </form>
  );
};

export default SearchBar;
