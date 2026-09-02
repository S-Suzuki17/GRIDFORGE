'use client';
import { useState, useEffect } from 'react';
import { Creature, Team } from '../types/game';
import { v4 as uuidv4 } from 'uuid';

export function useGameStore() {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedCreatures = localStorage.getItem('vsomega_creatures');
    const storedTeams = localStorage.getItem('vsomega_teams');
    const storedActive = localStorage.getItem('vsomega_active_team');
    if (storedCreatures) {
      try { setCreatures(JSON.parse(storedCreatures)); } catch (e) {}
    }
    if (storedTeams) {
      try { setTeams(JSON.parse(storedTeams)); } catch (e) {}
    }
    if (storedActive) {
      setActiveTeamId(storedActive);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('vsomega_creatures', JSON.stringify(creatures));
    }
  }, [creatures, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('vsomega_teams', JSON.stringify(teams));
    }
  }, [teams, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      if (activeTeamId) {
        localStorage.setItem('vsomega_active_team', activeTeamId);
      } else {
        localStorage.removeItem('vsomega_active_team');
      }
    }
  }, [activeTeamId, isLoaded]);

  const addCreature = (creature: Omit<Creature, 'id' | 'createdAt'>) => {
    const newCreature: Creature = {
      ...creature,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    setCreatures(prev => [...prev, newCreature]);
  };

  const deleteCreature = (id: string) => {
    setCreatures(prev => prev.filter(c => c.id !== id));
  };

  const addTeam = (team: Omit<Team, 'id'>) => {
    const newTeam: Team = {
      ...team,
      id: uuidv4(),
    };
    setTeams(prev => [...prev, newTeam]);
  };

  const deleteTeam = (id: string) => {
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  return {
    creatures,
    teams,
    addCreature,
    deleteCreature,
    addTeam,
    deleteTeam,
    activeTeamId,
    setActiveTeamId,
    isLoaded
  };
}
